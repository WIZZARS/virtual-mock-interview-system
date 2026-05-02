import React, { useState, useRef, useCallback, useEffect } from 'react';
import { groqChat, groqJsonChat, groqTranscribe, groqFollowUpCheck, groqStarCheck } from './src/lib/groqApi';
import { useNavigate } from 'react-router';
import { InterviewState, TranscriptMessage } from './types';
import { useInterviewStore } from './src/store/useInterviewStore';
import { useAuthStore } from './src/store/useAuthStore';
import { InterviewScreen } from './components/InterviewScreen';
import { ReportScreen } from './components/ReportScreen';
import { useVisionTracker, CoachingTip } from './src/hooks/useVisionTracker';

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

// Groq API is used for all AI operations (see src/lib/groqApi.ts)

export default function App() {
  const { track, difficulty, jobDescription, resumeText, vagueMode } = useInterviewStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [interviewState, setInterviewState] = useState<InterviewState>('idle');
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [liveFeedback, setLiveFeedback] = useState<CoachingTip[]>([]);
  const [finalReport, setFinalReport] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Connecting to Groq AI...');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const { isReady: isTrackerReady, analyzeVideoFrame, getFinalMetrics } = useVisionTracker(videoRef);

  const conversationHistory = useRef<string>("");
  const questionCount = useRef(0);           // real questions asked (excluding follow-ups)
  const followUpCount = useRef(0);           // follow-ups used so far
  const lastAIQuestion = useRef<string>(''); // tracks last question text for follow-up check
  const isFollowUp = useRef(false);          // whether current question is a follow-up
  const MAX_QUESTIONS = 15;
  const MAX_FOLLOW_UPS = 5;                  // cap follow-ups to avoid runaway sessions
  const isInterviewActive = useRef(false);
  const startTimeRef = useRef<number>(0);
  const startLockRef = useRef(false);

  // For Behavioral STAR track: log which components were present/missing per answer
  const starComponentLog = useRef<{ present: string[]; missing: string[] }[]>([]);

  // Per-question countdown timer
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Question timer duration in seconds based on difficulty
  const getQuestionTimeLimitSecs = () => {
    const d = difficulty || 'Fresher';
    if (d === 'Senior') return 90;
    if (d === 'Mid-Level') return 150;
    return 180; // Fresher gets 3 min
  };

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
          analyzeVideoFrame((tip: CoachingTip) => {
              setLiveFeedback(prev => {
                // Avoid exact duplicate messages in a row
                if (prev.length > 0 && prev[0].message === tip.message) return prev;
                return [tip, ...prev].slice(0, 8);
              });
          });
       }, 100);
    }
    return () => clearInterval(interval);
  }, [interviewState, isTrackerReady, analyzeVideoFrame]);

  // Clear question timer helper
  const clearQuestionTimer = useCallback(() => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    setQuestionTimeLeft(null);
  }, []);

  // Start per-question countdown — auto-submits when it hits 0
  const startQuestionTimer = useCallback(() => {
    clearQuestionTimer();
    const limit = getQuestionTimeLimitSecs();
    setQuestionTimeLeft(limit);
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(questionTimerRef.current!);
          questionTimerRef.current = null;
          // Auto-submit recording when time expires
          console.log('⏱️ Question timer expired — auto-submitting');
          stopAndSubmitRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearQuestionTimer, difficulty]);

  // ============================================================
  // CLEANUP
  // ============================================================
  const cleanup = useCallback(() => {
    isInterviewActive.current = false;
    startLockRef.current = false;
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    setQuestionTimeLeft(null);
    
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

    // Stop browser speech synthesis immediately
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // Stop TTS audio playback
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
    if (startLockRef.current) return;
    startLockRef.current = true;

    if (!track) {
        handleError("Please go back and select a track/difficulty first.");
        startLockRef.current = false;
        return;
    }

    setInterviewState('starting');
    setError(null);
    setTranscript([]);
    setLiveFeedback([]);
    setFinalReport('');
    conversationHistory.current = "";
    questionCount.current = 0;
    followUpCount.current = 0;
    lastAIQuestion.current = '';
    isFollowUp.current = false;
    starComponentLog.current = [];
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
     if (!userSpokenText) setLoadingMessage('Groq AI is preparing your first question...');

     try {
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

       // Persona & pacing adapted per track
       const personaByTrack: Record<string, string> = {
         'FAANG Technical': 'You are a senior engineer at Google or Meta. Focus on data structures, algorithms, Big-O analysis, and edge cases. Probe for depth and correctness.',
         'System Design': 'You are a staff engineer. Ask about scalability, distributed systems, CAP theorem, and tradeoffs. Push the candidate to think beyond the happy path.',
         'Startup Behavioral': 'You are the CTO of a fast-growing startup. Value ownership, pragmatism, and culture fit. Ask about real past situations using the STAR method.',
         'Behavioral STAR': 'You are an experienced HR director. Focus entirely on behavioral questions using the STAR framework. Probe for specific examples, not generalities.',
         'HR': 'You are a professional HR interviewer. Focus on culture fit, teamwork, communication, and motivational questions.',
         'Technical': 'You are a senior software engineer. Ask technical problem-solving questions relevant to the role.',
         'General': 'You are a professional interviewer. Ask a mix of behavioral, situational, and technical questions.',
       };
       const persona = personaByTrack[track || 'General'] || personaByTrack['General'];
       const questionLabel = isFollowUp.current
         ? `This is a follow-up to question ${questionCount.current} (do NOT increment the question count in your response).`
         : `This is question ${questionCount.current + 1} of ${MAX_QUESTIONS}.`;

       const vagueInstruction = vagueMode 
         ? '\n\nAMBIGUITY TRAINING ENABLED: Intentionally ask questions that are under-specified or vague (e.g., "Design a scalable system" without giving constraints). Reward the candidate if they ask clarifying questions before answering.' 
         : '';

       let pacingStrategy = '';
       if (track === 'System Design') {
         pacingStrategy = `
PACING:
- Q1: Brief introduction.
- Q2-Q15: PURE SYSTEM DESIGN. Ask them to architect large-scale systems (e.g., URL shortener, distributed cache, Netflix clone). Force them to discuss CAP theorem, DB choices, caching, and scalability. Do NOT ask basic resume questions.`;
       } else if (track === 'FAANG Technical') {
         pacingStrategy = `
PACING:
- Q1: Brief introduction.
- Q2-Q15: PURE ALGORITHMS & DATA STRUCTURES. Ask LeetCode-style questions. Focus on time/space complexity (Big-O), trees, graphs, and dynamic programming. Do NOT ask basic resume questions.`;
       } else if (track === 'Behavioral STAR') {
         pacingStrategy = `
PACING:
- Q1: Brief introduction.
- Q2-Q15: BEHAVIORAL QUESTIONS ONLY. Focus strictly on past experiences, conflicts, and leadership using the STAR method.`;
       } else if (track === 'Startup Behavioral') {
         pacingStrategy = `
PACING:
- Q1: Brief introduction.
- Q2-Q15: STARTUP CULTURE FIT. Focus on extreme ownership, ambiguity, wearing multiple hats, and bias for action. Use their resume to ask how they'd handle high-pressure, fast-paced startup scenarios.`;
       } else if (track === 'HR') {
         pacingStrategy = `
PACING:
- Q1: Brief introduction.
- Q2-Q15: HR & TEAMWORK. Focus on conflict resolution, communication style, long-term goals, and basic culture fit.`;
       } else if (track === 'Technical') {
         pacingStrategy = `
PACING:
- Q1: Brief introduction.
- Q2-Q15: ROLE-SPECIFIC TECHNICAL QUESTIONS. Focus heavily on the exact programming languages and tools mentioned in their resume and the job description.`;
       } else {
         pacingStrategy = `
PACING (for main questions, not follow-ups):
- Q1-3: Introductions and warm-up based on resume.
- Q4-8: Core domain questions.
- Q9-12: Deep dive and scenarios.
- Q13-15: Behavioral questions and wrap-up.`;
       }

       const systemInstruction = `You are a strict, professional interview coach conducting a realistic mock interview. ${persona}

Level: ${difficulty}.${jdContext}${resumeContext}${vagueInstruction}
${pacingStrategy}

RULES:
1. ${questionLabel}
2. After the candidate answers, give ONE sentence of strict coaching feedback. Do NOT blindly praise them. If their answer was under 15 words, vague, or evasive (like just saying "Yes"), explicitly call out that their answer was unacceptable and incomplete before asking the next question.
3. Max 3 sentences total. This is spoken conversation — no markdown, bullets, or emojis.
4. Use contractions naturally ("you'd", "that's", "let's").
5. First message (no history): Introduce yourself warmly, ask them to tell you about themselves.
6. At question ${MAX_QUESTIONS} after their answer, respond EXACTLY: "Interview complete. Generating your report."
`;

       const prompt = `${systemInstruction}\n\nHistory:\n${conversationHistory.current || "(First message)"}\n\nYour response:`;

       // Groq chat completion with timeout
       const responseText = await Promise.race([
         groqChat(systemInstruction, conversationHistory.current || '(First message)'),
         new Promise<string>((_, reject) =>
           setTimeout(() => reject(new Error('Groq response timed out after 20s')), 20000)
         )
       ]);

       if (!responseText || !isInterviewActive.current) throw new Error('Empty response from Groq');

       // Track the AI's question text for follow-up evaluation
       if (!isFollowUp.current) {
         lastAIQuestion.current = responseText;
       }
       isFollowUp.current = false; // reset for next cycle

       conversationHistory.current += `\nInterviewer: ${responseText}`;
       speakThenRecord(responseText);

     } catch(e: any) {
       console.error('❌ Groq text generation error:', e?.message || e);
       if (!isInterviewActive.current) return;

       // If this is the very first question, use a hardcoded fallback instead of hanging
       if (questionCount.current === 0 && conversationHistory.current === '') {
         console.warn('Using fallback opener because Groq text gen failed');
         conversationHistory.current += `\nInterviewer: ${FALLBACK_OPENER}`;
         speakThenRecord(FALLBACK_OPENER);
       } else {
         // Mid-interview failure — prompt user to repeat
         const retryMsg = "I had a brief connection issue. Could you repeat your last answer?";
         conversationHistory.current += `\nInterviewer: ${retryMsg}`;
         speakThenRecord(retryMsg);
       }
     }
  };

  // ============================================================
  // SPEAK (Gemini TTS → Audio element, with Web Speech fallback)
  // → then auto-start recording
  // ============================================================


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
    clearQuestionTimer(); // stop timer while AI is speaking

    const afterSpeech = () => {
      if (!isInterviewActive.current) return;
      setIsSpeaking(false);
      setTimeout(() => {
        if (isInterviewActive.current) {
          startRecording();
          startQuestionTimer(); // begin countdown once user starts their turn
        }
      }, 500);
    };

    // Update transcript immediately
    setTranscript(prev => {
      const last = prev[prev.length - 1];
      if (last?.text === textToSay) return prev;
      return [...prev, { speaker: 'ai', text: textToSay }];
    });

    // Use browser speechSynthesis for TTS (fast & reliable)
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(textToSay);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Pick a good English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
        || voices.find(v => v.name.includes('Microsoft') && v.lang.startsWith('en'))
        || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = afterSpeech;
      utterance.onerror = () => { afterSpeech(); };
      window.speechSynthesis.speak(utterance);
      console.log('🔊 Browser TTS speaking');
    } else {
      // No TTS available — just show text and continue after delay
      setTimeout(afterSpeech, 4000);
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
          autoGainControl: true,
          sampleRate: 48000,   // highest quality supported by most browsers
          channelCount: 1,     // mono — Whisper doesn't benefit from stereo
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
        const isSilent = average < 10; // Lower threshold to prevent false positives for quiet mics
        
        if (!isSilent) {
          userHasSpoken = true;
          silenceStartRef.current = 0; // Reset silence counter
        } else if (userHasSpoken) {
          // User was speaking but now is silent
          if (silenceStartRef.current === 0) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > 8000) {
            // 8 seconds of silence after speaking → auto-submit
            console.log("🤫 8s silence detected, auto-submitting...");
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

    // If the user has switched tabs, discard the audio — it likely captured ambient sound
    if (document.hidden) {
      console.warn('⚠️ Tab not visible at submit time — discarding audio');
      try { mediaRecorderRef.current.stop(); } catch(e) {}
      audioChunksRef.current = [];
      setIsRecording(false);
      setAudioLevel(0);
      return;
    }
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

    // Send audio blob to Groq Whisper for transcription
    try {
      await processAudioWithGroq(audioBlob);
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

  // Send audio to Groq Whisper for transcription + interview response
  const processAudioWithGroq = async (audioBlob: Blob) => {
    if (!isInterviewActive.current) return;

    try {
      let transcription = await groqTranscribe(audioBlob);
      transcription = transcription.replace(/\[\s*\d+m\d+s.*?\]/g, '').replace(/\[noise\]/gi, '').trim();

      console.log("📝 Transcription:", transcription);

      if (!transcription || transcription.length < 3) {
        setIsProcessing(false);
        if (isInterviewActive.current) {
          speakThenRecord("I couldn't hear your answer clearly. Could you speak a bit louder and try again?");
        }
        return;
      }

      setTranscript(prev => [...prev, { speaker: 'user', text: transcription }]);

      // Capture and immediately reset the follow-up flag.
      // If the user is answering a follow-up, we do NOT probe again — just move on.
      const wasFollowUp = isFollowUp.current;
      isFollowUp.current = false;

      // ── Follow-up question logic ──────────────────────────────────────────
      const canAskFollowUp =
        !wasFollowUp &&                            // never chain follow-up on follow-up
        lastAIQuestion.current.length > 10 &&
        followUpCount.current < MAX_FOLLOW_UPS &&
        questionCount.current < MAX_QUESTIONS;

      if (canAskFollowUp) {
        try {
          const isStar = track === 'Behavioral STAR';

          if (isStar) {
            // ── STAR-aware follow-up ──────────────────────────────────────
            const starResult = await groqStarCheck(lastAIQuestion.current, transcription);
            console.log('⭐ STAR check:', starResult);

            // Log components for this answer
            starComponentLog.current.push({
              present: starResult.presentComponents,
              missing: starResult.missingComponents,
            });

            if (starResult.missingComponents.length > 0 && starResult.followUpQuestion) {
              console.log('🔄 STAR follow-up:', starResult.followUpQuestion, '| Missing:', starResult.missingComponents);
              followUpCount.current++;
              isFollowUp.current = true;
              conversationHistory.current += `\nCandidate: ${transcription}`;
              conversationHistory.current += `\nInterviewer: ${starResult.followUpQuestion}`;
              setIsProcessing(false);
              speakThenRecord(starResult.followUpQuestion);
              return;
            }
          } else {
            // ── Generic follow-up ─────────────────────────────────────────
            const followUpResult = await groqFollowUpCheck(
              track || 'General',
              difficulty || 'Fresher',
              lastAIQuestion.current,
              transcription
            );
            if (followUpResult.needsFollowUp && followUpResult.followUpQuestion) {
              console.log('🔄 Follow-up triggered:', followUpResult.followUpQuestion);
              followUpCount.current++;
              isFollowUp.current = true;
              conversationHistory.current += `\nCandidate: ${transcription}`;
              conversationHistory.current += `\nInterviewer: ${followUpResult.followUpQuestion}`;
              setIsProcessing(false);
              speakThenRecord(followUpResult.followUpQuestion);
              return;
            }
          }
        } catch (e) {
          console.warn('Follow-up check failed (non-fatal):', e);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      setIsProcessing(false);
      await generateNextAIResponse(transcription);

    } catch (err) {
      console.error("Groq audio processing error:", err);
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
      const transcriptText = finalTranscript
        .map(t => `${t.speaker === 'user' ? 'Candidate' : 'Interviewer'}: ${t.text}`)
        .join('\n');
      
      const metrics = getFinalMetrics();
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      const qCount = finalTranscript.filter(t => t.speaker === 'ai').length;
      const answerCount = finalTranscript.filter(t => t.speaker === 'user').length;
      const followUpsUsed = followUpCount.current;
      
      // Extract just the AI question turns for debrief
      const aiQuestions = finalTranscript
        .filter(t => t.speaker === 'ai')
        .map(t => t.text)
        .slice(0, 8);

      // Build STAR-specific schema addition if applicable
      const isStarTrack = track === 'Behavioral STAR';
      const starLogSummary = isStarTrack && starComponentLog.current.length > 0
        ? `\nSTAR Component Data (per answer): ${JSON.stringify(starComponentLog.current)}`
        : '';

      const starSchemaAddition = isStarTrack ? `,
  "starStructureAnalysis": {
    "situationScore": N,
    "taskScore": N,
    "actionScore": N,
    "resultScore": N,
    "overallStarScore": N,
    "starFeedback": "Honest assessment of how well the candidate used STAR structure across all answers."
  }` : '';

      const vagueSchemaAddition = vagueMode ? `,
  "ambiguityAnalysis": {
    "clarificationScore": N,
    "feedback": "Honest assessment of how well the candidate asked clarifying questions when presented with vague or under-specified scenarios."
  }` : '';

      const starScoringRules = isStarTrack ? `
STAR SCORING RULES (only for Behavioral STAR track):
- situationScore: How well they set context in their answers (0-10)
- taskScore: How clearly they defined their personal responsibility (0-10)
- actionScore: How specific and personal their actions were — penalize heavy "we" usage (0-10)
- resultScore: How measurable/concrete their outcomes were (0-10)
- overallStarScore: Average of the four, adjusted for consistency
- Use the STAR Component Data above to inform these scores accurately
${starLogSummary}` : ''; // limit debrief to first 8 questions

      const prompt = `You are a STRICT and HONEST interview coach. Generate a realistic performance report as JSON.

CRITICAL RULES FOR SCORING:
- If the interview lasted less than 2 minutes, ALL scores must be 2.0 or below.
- If the candidate answered fewer than 3 questions, scores should not exceed 4.0.
- If answers are very short (1-2 words each), communication and confidence scores must be LOW (1-3).
- Do NOT inflate scores. A 7+ score requires genuinely good, detailed answers.
- Base scores ONLY on what actually happened in the transcript.
- Eye contact and body language scores come from vision data — use them as-is.
${starScoringRules}
SESSION FACTS:
- Duration: ${Math.floor(duration / 60)}m ${duration % 60}s
- Questions asked by AI: ${qCount} (including ${followUpsUsed} follow-up questions)
- Answers given by candidate: ${answerCount}
- Track: ${track} | Level: ${difficulty}
- Vision Data: Eye Contact: ${metrics.eyeContactScore}/10, Posture: ${metrics.postureScore}/10

Generate JSON with EXACTLY this schema (all scores 0.0-10.0):
{
  "overallSummary": "Honest 2-3 sentence summary of the session.",
  "scores": {
    "communication": N, "confidence": N,
    "bodyLanguage": ${metrics.postureScore}, "eyeContact": ${metrics.eyeContactScore},
    "speakingPace": N, "overall": N
  },
  "detailedAnalysis": {
    "communication": "...", "confidence": "...",
    "bodyLanguage": "...", "eyeContact": "...", "speakingPace": "..."
  },
  "strengths": ["...", "...", "..."],
  "improvementTips": ["...", "...", "...", "...", "..."],
  "industryBenchmark": "Compare this candidate honestly to a typical ${difficulty}-level ${track} candidate at a top company. Be specific about where they stand.",
  "questionDebrief": [
    { "question": "...", "whyAsked": "...", "idealApproach": "..." }
  ],
  "nextSteps": [
    { "action": "...", "resource": "..." },
    { "action": "...", "resource": "..." },
    { "action": "...", "resource": "..." }
  ]${starSchemaAddition}${vagueSchemaAddition}
}

For questionDebrief, use these actual questions asked: ${JSON.stringify(aiQuestions)}

Transcript:\n${transcriptText}`;

      const reportJsonText = await groqJsonChat(
        'You are an expert interview coach. Generate a performance report as JSON with the exact schema requested.',
        prompt
      );
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
                  <svg className="animate-spin h-10 w-10 text-primary mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground animate-fadeIn">Initializing AI Interview Coach...</h2>
                  <p className="text-sm text-muted-foreground mt-2 animate-fadeIn">Setting up {difficulty} {track} session. Please allow camera + mic.</p>
                  <p className="text-xs text-muted-foreground/60 mt-3 animate-fadeIn">{loadingMessage}</p>
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
                questionTimeLeft={questionTimeLeft}
                questionTimeLimit={getQuestionTimeLimitSecs()}
                totalQuestions={MAX_QUESTIONS}
                onEndInterview={endInterviewEarly}
                onStopRecording={stopAndSubmitRecording}
                onManualSubmit={handleManualSubmit}
            />;
        case 'generating_report':
            return (
              <div className="flex flex-col items-center justify-center min-h-screen bg-background">
                <svg className="animate-spin h-10 w-10 text-primary mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h2 className="text-xl font-semibold tracking-tight text-foreground animate-fadeInUp">Interview Complete.</h2>
                <p className="text-sm text-muted-foreground mt-2">Analyzing your performance...</p>
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