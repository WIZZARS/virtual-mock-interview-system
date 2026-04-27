import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useNavigate } from 'react-router';
import { InterviewState, TranscriptMessage } from './types';
import { useInterviewStore } from './src/store/useInterviewStore';
import { useAuthStore } from './src/store/useAuthStore';
import { InterviewScreen } from './components/InterviewScreen';
import { ReportScreen } from './components/ReportScreen';
import { useVisionTracker } from './src/hooks/useVisionTracker';

// ============================================================
// HELPERS: Build a WAV blob from raw PCM (Int16, 24 kHz, mono)
// ============================================================
function pcmBase64ToWavBlob(base64Pcm: string, sampleRate = 24000, channels = 1, bitsPerSample = 16): Blob {
  const pcmBytes = Uint8Array.from(atob(base64Pcm), c => c.charCodeAt(0));
  const dataLen = pcmBytes.length;
  const headerLen = 44;
  const buf = new ArrayBuffer(headerLen + dataLen);
  const view = new DataView(buf);
  const write = (offset: number, val: string) => { for (let i = 0; i < val.length; i++) view.setUint8(offset + i, val.charCodeAt(i)); };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
  view.setUint16(32, channels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  write(36, 'data');
  view.setUint32(40, dataLen, true);
  new Uint8Array(buf, headerLen).set(pcmBytes);
  return new Blob([buf], { type: 'audio/wav' });
}

export default function App() {
  const { track, difficulty, jobDescription, resumeText } = useInterviewStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [interviewState, setInterviewState] = useState<InterviewState>('idle');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [liveFeedback, setLiveFeedback] = useState<string[]>([]);
  const [finalReport, setFinalReport] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to Gemini AI...');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const { isReady: isTrackerReady, analyzeVideoFrame, getFinalMetrics } = useVisionTracker(videoRef);

  const conversationHistory = useRef<string>("");
  const questionCount = useRef(0);
  const MAX_QUESTIONS = 15;
  const isInterviewActive = useRef(false);
  const startTimeRef = useRef<number>(0);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceStartRef = useRef<number>(0);

  // Gemini TTS audio element
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsObjectUrlRef = useRef<string | null>(null);

  // Init Gemini TTS audio element once
  useEffect(() => {
    ttsAudioRef.current = new Audio();
    return () => {
      if (ttsObjectUrlRef.current) URL.revokeObjectURL(ttsObjectUrlRef.current);
    };
  }, []);

  // Vision tracking
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (interviewState === 'in_progress' && isTrackerReady) {
       interval = setInterval(() => {
          analyzeVideoFrame((tip) => {
              setLiveFeedback(prev => [tip, ...prev].slice(0, 5));
          });
       }, 100);
    }
    return () => clearInterval(interval);
  }, [interviewState, isTrackerReady, analyzeVideoFrame]);

  // ============================================================
  // CLEANUP
  // ============================================================
  const cleanup = useCallback(() => {
    isInterviewActive.current = false;
    
    // Stop recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch(e) {}
    }
    mediaRecorderRef.current = null;
    
    // Stop audio stream
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioStreamRef.current = null;
    
    // Stop audio context
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    
    // Clear intervals/timers
    if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    // Stop video
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;

    // Stop Gemini TTS playback
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = '';
    }
    if (ttsObjectUrlRef.current) {
      URL.revokeObjectURL(ttsObjectUrlRef.current);
      ttsObjectUrlRef.current = null;
    }

    setIsSpeaking(false);
    setIsRecording(false);
    setIsProcessing(false);
    setAudioLevel(0);
  }, []);

  const handleError = useCallback((message: string, err?: any) => {
    console.error(message, err);
    setError(message);
    setInterviewState('error');
    cleanup();
  }, [cleanup]);

  // ============================================================
  // START INTERVIEW
  // ============================================================
  const startInterview = useCallback(async () => {
    if (!track) {
        handleError("Please go back and select a track/difficulty first.");
        return;
    }

    setInterviewState('starting');
    setError(null);
    setTranscript([]);
    setLiveFeedback([]);
    setFinalReport('');
    conversationHistory.current = "";
    questionCount.current = 0;
    isInterviewActive.current = true;
    startTimeRef.current = Date.now();

    try {
        // Get both audio + video permissions
        const fullStream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: true 
        });
        
        // Keep video for camera, stop audio (we'll create fresh audio streams for each recording)
        fullStream.getAudioTracks().forEach(t => t.stop());
        const videoOnlyStream = new MediaStream(fullStream.getVideoTracks());
        mediaStreamRef.current = videoOnlyStream;
        
        console.log("✅ Camera + mic permissions granted.");
        
        setInterviewState('in_progress');
        
        setTimeout(() => {
          if (isInterviewActive.current) {
            generateNextAIResponse("");
          }
        }, 1500);

    } catch (err) {
        handleError('Camera and Microphone permissions are required for the interview. Please allow access and try again.', err);
    }
  }, [track, handleError]);

  useEffect(() => {
    if (interviewState === 'idle' && track) {
      startInterview();
    }
  }, []);

  useEffect(() => {
    if (interviewState === 'in_progress' && mediaStreamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== mediaStreamRef.current) {
        videoRef.current.srcObject = mediaStreamRef.current;
      }
    }
  }, [interviewState]);

  // ============================================================
  // AI RESPONSE GENERATION
  // ============================================================
  const FALLBACK_OPENER = `Hi! I'm your AI interview coach for this ${track || 'technical'} session at ${difficulty || 'Fresher'} level. Great to meet you! To kick things off, could you tell me a little about yourself and your background?`;

  const generateNextAIResponse = async (userSpokenText: string) => {
     if (!isInterviewActive.current) return;

     // Show a loading indicator while fetching
     if (!userSpokenText) setLoadingMessage('Gemini AI is preparing your first question...');

     try {
       const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
       if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not set in .env.local");
       
       const ai = new GoogleGenAI({ apiKey });
       
       if (userSpokenText) {
          conversationHistory.current += `\nCandidate: ${userSpokenText}`;
          questionCount.current++;
       }

       const resumeContext = resumeText 
         ? `\nCandidate's Resume:\n${resumeText.substring(0, 2000)}` 
         : '';
       const jdContext = jobDescription 
         ? `\nJob Description:\n${jobDescription.substring(0, 1500)}`
         : '';

       const systemInstruction = `You are a professional ${track} interview coach conducting a mock interview, like the ones at Google, Meta, Amazon. You are a supportive but realistic mentor helping the candidate prepare.

Level: ${difficulty}.${jdContext}${resumeContext}

PACING:
- Q1-3: Introductions, icebreakers.
- Q4-8: Core technical/domain questions.
- Q9-12: Deep dive scenarios.
- Q13-15: Behavioral STAR questions, wrap-up.

RULES:
1. This is question ${questionCount.current + 1} of ${MAX_QUESTIONS}.
2. After the candidate answers, give ONE sentence of coaching feedback, then ask the next question. Example: "That's a great answer, I liked how you structured it. Now let me ask..."
3. Max 3 sentences. This is spoken conversation, keep it natural. No markdown, bullets, or emojis.
4. Use contractions naturally ("you'd", "that's", "let's").
5. First message (no history): Introduce yourself warmly, ask them to tell you about themselves.
6. At question ${MAX_QUESTIONS} after their answer, respond EXACTLY: "Interview complete. Generating your report."
`;

       const prompt = `${systemInstruction}\n\nHistory:\n${conversationHistory.current || "(First message)"}\n\nYour response:`;

       // Race the API call against a 20-second timeout
       const responseText = await Promise.race([
         ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt })
           .then(r => (r.text || '').trim()),
         new Promise<string>((_, reject) =>
           setTimeout(() => reject(new Error('Gemini response timed out after 20s')), 20000)
         )
       ]);

       if (!responseText || !isInterviewActive.current) throw new Error('Empty response from Gemini');
       
       conversationHistory.current += `\nInterviewer: ${responseText}`;
       setTranscript(prev => [...prev, { speaker: 'ai', text: responseText }]);
       speakThenRecord(responseText);

     } catch(e: any) {
       console.error('❌ Gemini text generation error:', e?.message || e);
       if (!isInterviewActive.current) return;

       // If this is the very first question, use a hardcoded fallback instead of hanging
       if (questionCount.current === 0 && conversationHistory.current === '') {
         console.warn('Using fallback opener because Gemini text gen failed');
         conversationHistory.current += `\nInterviewer: ${FALLBACK_OPENER}`;
         setTranscript(prev => [...prev, { speaker: 'ai', text: FALLBACK_OPENER }]);
         speakThenRecord(FALLBACK_OPENER);
       } else {
         // Mid-interview failure — prompt user to repeat
         const retryMsg = "I had a brief connection issue. Could you repeat your last answer?";
         conversationHistory.current += `\nInterviewer: ${retryMsg}`;
         setTranscript(prev => [...prev, { speaker: 'ai', text: retryMsg }]);
         speakThenRecord(retryMsg);
       }
     }
  };

  // ============================================================
  // SPEAK (Gemini TTS → Audio element, with Web Speech fallback)
  // → then auto-start recording
  // ============================================================

  /** Browser Web Speech API fallback (always available) */
  const speakWithBrowser = (text: string, onDone: () => void) => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google US English') ||
      v.name.includes('Microsoft David') ||
      v.name.includes('Microsoft Mark') ||
      v.name.includes('Samantha') ||
      v.name.includes('Daniel')
    ) || voices.find(v => v.lang.startsWith('en') && !v.localService)
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
    utt.rate = 1.0; utt.pitch = 1.0; utt.volume = 1.0;
    // Chrome keepalive
    const ka = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(ka); return; }
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 3000);
    utt.onend = () => { clearInterval(ka); onDone(); };
    utt.onerror = () => { clearInterval(ka); onDone(); };
    window.speechSynthesis.speak(utt);
  };

  const speakThenRecord = async (textToSay: string) => {
    if (!isInterviewActive.current) return;

    if (textToSay.includes('Interview complete') || textToSay.includes('Generating your report')) {
      setTranscript(prev => {
        const last = prev[prev.length - 1];
        if (last?.text !== textToSay) return [...prev, { speaker: 'ai', text: textToSay }];
        return prev;
      });
      setInterviewState('generating_report');
      return;
    }

    setIsSpeaking(true);
    setIsRecording(false);
    setIsProcessing(false);

    const afterSpeech = () => {
      if (!isInterviewActive.current) return;
      setIsSpeaking(false);
      setTimeout(() => { if (isInterviewActive.current) startRecording(); }, 500);
    };

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('No API key');
      const ai = new GoogleGenAI({ apiKey });

      // Try Gemini TTS (with 15s timeout)
      const ttsResponse = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: textToSay }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TTS timeout')), 15000)
        )
      ]);

      const part = ttsResponse.candidates?.[0]?.content?.parts?.[0];
      const pcmBase64 = (part as any)?.inlineData?.data;

      if (!pcmBase64) throw new Error('No PCM data in TTS response');
      if (!isInterviewActive.current) return;

      const wavBlob = pcmBase64ToWavBlob(pcmBase64);
      if (ttsObjectUrlRef.current) URL.revokeObjectURL(ttsObjectUrlRef.current);
      const url = URL.createObjectURL(wavBlob);
      ttsObjectUrlRef.current = url;

      const audio = ttsAudioRef.current!;
      audio.src = url;
      audio.onended = afterSpeech;
      audio.onerror = () => { console.warn('Audio element error, using browser TTS'); speakWithBrowser(textToSay, afterSpeech); };
      await audio.play();
      console.log('🔊 Gemini TTS playing');

    } catch (err) {
      console.warn('Gemini TTS unavailable, falling back to browser TTS:', (err as any)?.message);
      // Graceful fallback to browser Speech Synthesis
      setIsSpeaking(true);
      speakWithBrowser(textToSay, afterSpeech);
    }
  };

  // ============================================================
  // AUDIO RECORDING (MediaRecorder + Web Audio API for levels)
  // ============================================================
  const startRecording = async () => {
    if (!isInterviewActive.current) return;

    try {
      // Get a fresh audio stream for this recording
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });
      audioStreamRef.current = audioStream;

      // Set up Web Audio API for level monitoring
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Choose best available format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(audioStream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Clean up audio monitoring
        if (levelIntervalRef.current) clearInterval(levelIntervalRef.current);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        setAudioLevel(0);
      };

      // Request data every 500ms for more granular chunks
      recorder.start(500);
      setIsRecording(true);
      setIsProcessing(false);
      silenceStartRef.current = 0;

      console.log("🎙️ Recording started.");

      // Monitor audio levels for visualization + silence detection
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let userHasSpoken = false;

      levelIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const normalizedLevel = Math.min(average / 80, 1); // Normalize to 0-1
        setAudioLevel(normalizedLevel);

        // Silence detection
        const isSilent = average < 8; // Very low threshold
        
        if (!isSilent) {
          userHasSpoken = true;
          silenceStartRef.current = 0; // Reset silence counter
        } else if (userHasSpoken) {
          // User was speaking but now is silent
          if (silenceStartRef.current === 0) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > 5000) {
            // 5 seconds of silence after speaking → auto-submit
            console.log("🤫 5s silence detected, auto-submitting...");
            stopAndSubmitRecording();
          }
        }
      }, 100);

    } catch(err) {
      console.error("Failed to start recording:", err);
      handleError("Could not access microphone. Please check your browser permissions.", err);
    }
  };

  // Stop recording and process the audio
  const stopAndSubmitRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    setIsRecording(false);
    setIsProcessing(true);
    setAudioLevel(0);

    // Stop level monitoring
    if (levelIntervalRef.current) { clearInterval(levelIntervalRef.current); levelIntervalRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }

    // Stop the recorder — this triggers ondataavailable one last time
    const recorder = mediaRecorderRef.current;
    
    await new Promise<void>((resolve) => {
      const originalOnStop = recorder.onstop;
      recorder.onstop = (e) => {
        if (originalOnStop) (originalOnStop as any).call(recorder, e);
        resolve();
      };
      recorder.stop();
    });

    // Stop audio stream
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioStreamRef.current = null;
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    // Build the audio blob
    const mimeType = recorder.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    audioChunksRef.current = [];

    console.log(`🎙️ Recording stopped. Blob size: ${(audioBlob.size / 1024).toFixed(1)} KB`);

    if (audioBlob.size < 1000) {
      // Extremely small recording — probably just noise
      console.warn("Recording too short/empty.");
      setIsProcessing(false);
      if (isInterviewActive.current) {
        speakThenRecord("I didn't hear an answer. Please try again when you're ready.");
      }
      return;
    }

    // Convert to base64 and send to Gemini
    try {
      const base64Audio = await blobToBase64(audioBlob);
      await processAudioWithGemini(base64Audio, mimeType);
    } catch (err) {
      console.error("Error processing audio:", err);
      setIsProcessing(false);
      if (isInterviewActive.current) {
        speakThenRecord("I had trouble processing your answer. Could you try again?");
      }
    }
  }, []);

  // Convert Blob to base64 string (without data URL prefix)
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Remove the "data:audio/webm;base64," prefix
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Send audio to Gemini for transcription + interview response
  const processAudioWithGemini = async (base64Audio: string, mimeType: string) => {
    if (!isInterviewActive.current) return;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API key not set.");
      
      const ai = new GoogleGenAI({ apiKey });

      // Step 1: Transcribe the audio
      const transcribeResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { 
              inlineData: { 
                mimeType: mimeType.split(';')[0], // e.g., "audio/webm"
                data: base64Audio 
              } 
            },
            { 
              text: 'Transcribe this audio recording accurately. Return ONLY the transcribed text, nothing else. If there is no speech or just noise, return exactly: "[no speech detected]"' 
            }
          ]
        }]
      });

      const transcription = (transcribeResponse.text || "").trim();
      console.log("📝 Transcription:", transcription);

      if (!transcription || transcription.includes("[no speech detected]") || transcription.length < 3) {
        setIsProcessing(false);
        if (isInterviewActive.current) {
          speakThenRecord("I couldn't hear your answer clearly. Could you speak a bit louder and try again?");
        }
        return;
      }

      // Add user's answer to transcript
      setTranscript(prev => [...prev, { speaker: 'user', text: transcription }]);
      setIsProcessing(false);

      // Step 2: Generate AI interviewer response
      await generateNextAIResponse(transcription);

    } catch (err) {
      console.error("Gemini audio processing error:", err);
      setIsProcessing(false);
      if (isInterviewActive.current) {
        speakThenRecord("Sorry, I had trouble processing that. Could you repeat your answer?");
      }
    }
  };

  // Manual text submit (small fallback)
  const handleManualSubmit = useCallback((text: string) => {
    if (!isInterviewActive.current || !text.trim()) return;
    
    // Stop any active recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch(e) {}
    }
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    
    setIsRecording(false);
    setIsProcessing(false);
    setAudioLevel(0);
    
    setTranscript(prev => [...prev, { speaker: 'user', text: text.trim() }]);
    generateNextAIResponse(text.trim());
  }, []);

  // ============================================================
  // END / REPORT / NAVIGATION
  // ============================================================
  const endInterviewEarly = useCallback(() => {
    if (!isInterviewActive.current) return;
    cleanup();
    setInterviewState('generating_report');
  }, [cleanup]);

  const generateFinalReport = useCallback(async (finalTranscript: TranscriptMessage[]) => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API key not set");
      
      const ai = new GoogleGenAI({ apiKey });
      const transcriptText = finalTranscript
        .map(t => `${t.speaker === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`)
        .join('\n');
      
      const metrics = getFinalMetrics();
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      const prompt = `You are an expert interview coach. Generate a performance report as JSON.

VISION DATA: Eye Contact: ${metrics.eyeContactScore}/10, Posture: ${metrics.postureScore}/10
Duration: ${Math.floor(duration / 60)}m ${duration % 60}s | Track: ${track} | Level: ${difficulty}

JSON format:
{
  "overallSummary": "Summary paragraph...",
  "scores": { "communication": N, "confidence": N, "bodyLanguage": ${metrics.postureScore}, "eyeContact": ${metrics.eyeContactScore}, "speakingPace": N, "overall": N },
  "detailedAnalysis": { "communication": "...", "confidence": "...", "bodyLanguage": "...", "eyeContact": "...", "speakingPace": "..." },
  "strengths": ["...", "...", "..."],
  "improvementTips": ["...", "...", "...", "...", "..."]
}

Transcript:\n${transcriptText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const reportJsonText = response.text || "";
      setFinalReport(reportJsonText);
      setInterviewState('report_ready');

      if (user) {
         try {
             const parsed = JSON.parse(reportJsonText);
             const { supabase } = await import('./src/lib/supabase');
             await supabase.from('session_scores').insert({
                 user_id: user.id, track: track || 'Unknown', difficulty: difficulty || 'Fresher',
                 score_overall: parsed.scores.overall, score_communication: parsed.scores.communication,
                 score_confidence: parsed.scores.confidence, score_body_language: parsed.scores.bodyLanguage,
                 score_eye_contact: parsed.scores.eyeContact, score_speaking_pace: parsed.scores.speakingPace,
                 report_json: parsed, duration_seconds: duration,
             });
         } catch(e) { console.warn("DB save failed:", e); }
      }
    } catch (err) {
      handleError('Failed to generate report.', err);
    }
  }, [handleError, track, difficulty, user, getFinalMetrics]);
  
  useEffect(() => {
    if (interviewState === 'generating_report') {
      cleanup();
      generateFinalReport(transcript);
    }
  }, [interviewState]);

  const handleRestart = () => { cleanup(); navigate('/setup'); };
  const handleGoToDashboard = () => { cleanup(); navigate('/dashboard'); };

  // ============================================================
  // RENDER
  // ============================================================
  const renderContent = () => {
    switch (interviewState) {
        case 'idle':
        case 'starting':
            return (
               <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-breathe"></div>
                    <svg className="animate-spin h-12 w-12 text-primary relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mt-6 animate-fadeIn">Initializing AI Interview Coach...</h2>
                  <p className="text-muted-foreground mt-2 animate-fadeIn">Setting up {difficulty} {track} session. Please allow camera + mic.</p>
                  <p className="text-xs text-primary/60 mt-3 animate-fadeIn">{loadingMessage}</p>
               </div>
            );
        case 'in_progress':
            return <InterviewScreen 
                videoRef={videoRef}
                transcript={transcript}
                liveFeedback={liveFeedback}
                startTime={startTimeRef.current}
                isSpeaking={isSpeaking}
                isRecording={isRecording}
                isProcessing={isProcessing}
                audioLevel={audioLevel}
                onEndInterview={endInterviewEarly}
                onStopRecording={stopAndSubmitRecording}
                onManualSubmit={handleManualSubmit}
            />;
        case 'generating_report':
            return (
              <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-secondary/20 rounded-full blur-xl animate-breathe"></div>
                  <svg className="animate-spin h-16 w-16 text-secondary relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h2 className="text-3xl font-extrabold text-foreground animate-fadeInUp">Interview Complete! 🎉</h2>
                <p className="text-lg text-muted-foreground mt-3">Analyzing your performance...</p>
              </div>
            );
        case 'report_ready':
            return <ReportScreen report={finalReport} onDownload={() => {}} onRestart={handleRestart} onDashboard={handleGoToDashboard} startTime={startTimeRef.current} />;
        case 'error':
            return (
              <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
                <div className="bg-destructive/10 p-6 rounded-full mb-6">
                  <svg className="w-12 h-12 text-destructive" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h2 className="text-2xl text-destructive font-bold mb-4">Something Went Wrong</h2>
                <p className="text-muted-foreground mb-8 max-w-md text-center">{error}</p>
                <div className="flex gap-4">
                  <button onClick={handleRestart} className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-full hover:scale-105 transition-all shadow-lg">Try Again</button>
                  <button onClick={() => navigate('/')} className="bg-card border border-border text-foreground font-bold py-3 px-8 rounded-full hover:bg-muted transition-all">Go Home</button>
                </div>
              </div>
            );
    }
  };

  return <div className="w-full h-full">{renderContent()}</div>;
}