import React, { useEffect, useRef, useState } from 'react';
import { TranscriptMessage } from '../types';
import { useInterviewStore } from '../src/store/useInterviewStore';
import { CoachingTip, FeedbackCategory } from '../src/hooks/useVisionTracker';
import { Mic, MicOff, Eye, BadgeInfo, PhoneOff, Cpu, Volume2, Clock, Send, Keyboard, Square, Loader2, User, Smile, Move, ZoomIn, CircleAlert, CheckCircle2, Sparkles } from 'lucide-react';

interface InterviewScreenProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  transcript: TranscriptMessage[];
  liveFeedback: CoachingTip[];
  startTime: number;
  isSpeaking: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
  onEndInterview: () => void;
  onStopRecording: () => void;
  onManualSubmit: (text: string) => void;
}

export const InterviewScreen: React.FC<InterviewScreenProps> = ({ 
  videoRef, transcript, liveFeedback, startTime, isSpeaking, isRecording, 
  isProcessing, audioLevel, onEndInterview, onStopRecording, onManualSubmit 
}) => {
  const { track, difficulty } = useInterviewStore();
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const coachingTopRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [manualText, setManualText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Live timer
  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Auto-scroll coaching tips to top when new tip arrives
  useEffect(() => {
    coachingTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [liveFeedback]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (manualText.trim()) {
      onManualSubmit(manualText.trim());
      setManualText('');
    }
  };

  const questionNumber = transcript.filter(t => t.speaker === 'ai').length;

  // Generate audio level bars
  const generateBars = (count: number) => {
    return [...Array(count)].map((_, i) => {
      const barHeight = isRecording 
        ? Math.max(4, audioLevel * 40 * (0.5 + Math.random() * 0.5))
        : 4;
      return (
        <div 
          key={i} 
          className="w-1 bg-red-400 rounded-full transition-all duration-100"
          style={{ height: `${barHeight}px` }}
        />
      );
    });
  };

  return (
    <div className="h-screen max-h-screen bg-background flex flex-col font-sans overflow-hidden">
      
      {/* Top Header */}
      <header className="h-14 border-b border-border glass-strong px-4 md:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-xs font-bold border border-primary/20">
            <Cpu className="w-3.5 h-3.5" /> Gemini AI
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
             <span className="px-2 py-0.5 bg-muted rounded-md">{track}</span>
             <span className="px-2 py-0.5 bg-muted rounded-md">{difficulty}</span>
          </div>
          {questionNumber > 0 && (
            <div className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-muted/50 rounded-md">
              Q{questionNumber}/15
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300 ${
            isSpeaking 
              ? 'bg-secondary/10 text-secondary border border-secondary/20' 
              : isRecording 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : isProcessing
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  : 'bg-muted text-muted-foreground'
          }`}>
            {isSpeaking ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>AI Speaking</span>
                <div className="flex items-center gap-0.5 ml-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-0.5 bg-secondary rounded-full audio-bar" 
                      style={{ height: '10px', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </>
            ) : isRecording ? (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>Recording {formatTime(recordingTime)}</span>
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Waiting</span>
              </>
            )}
          </div>

          {/* Timer */}
          <div className="font-mono text-lg font-bold tracking-widest text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            {formatTime(elapsed)}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 md:p-4 min-h-0">
        
        {/* Left: Camera */}
        <div className="w-full lg:w-1/2 flex flex-col gap-3">
          <div className="flex-1 bg-black rounded-2xl overflow-hidden relative shadow-2xl border border-border">
            <video 
               ref={videoRef} 
               autoPlay 
               muted 
               playsInline 
               className="w-full h-full object-cover transform -scale-x-100" 
            />
            
            {/* LIVE Badge */}
            <div className="absolute top-4 left-4 bg-red-500/90 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              LIVE
            </div>

            {/* AI Speaking visualizer */}
            {isSpeaking && (
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-0.5 h-8 justify-center">
                   {[...Array(24)].map((_, i) => (
                      <div key={i} className="w-1 bg-secondary/80 rounded-full audio-bar" 
                        style={{ animationDelay: `${i * 0.08}s`, animationDuration: `${0.5 + Math.random() * 0.5}s` }} />
                   ))}
              </div>
            )}
            
            {/* Recording indicator on camera */}
            {isRecording && (
              <div className="absolute bottom-4 left-4 right-4 flex flex-col items-center gap-2">
                {/* Waveform bars */}
                <div className="flex items-end gap-0.5 h-10 justify-center">
                  {generateBars(32)}
                </div>
                <div className="bg-red-500/20 backdrop-blur-md px-5 py-2 rounded-full flex items-center gap-2 border border-red-500/30">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-red-400">Recording — speak your answer</span>
                </div>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center">
                <div className="bg-yellow-500/20 backdrop-blur-md px-5 py-2 rounded-full flex items-center gap-2 border border-yellow-500/30">
                  <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                  <span className="text-sm font-bold text-yellow-400">Transcribing your answer with AI...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Feedback & Transcript */}
        <div className="w-full lg:w-1/2 flex flex-col gap-3 min-h-0">
          
          {/* Live Coaching */}
          <div className="shrink-0 h-[28%] bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col min-h-[150px]">
            <h2 className="text-sm font-extrabold flex items-center gap-2 mb-2 shrink-0">
              <Sparkles className="w-4 h-4 text-secondary" /> Real-Time AI Coaching
            </h2>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              <div ref={coachingTopRef} />
              {liveFeedback.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-1">
                   <BadgeInfo className="w-6 h-6" />
                   <p className="text-xs font-medium text-center">AI is analyzing your posture, eye contact, expressions & body language...</p>
                </div>
              ) : (
                liveFeedback.map((tip, index) => {
                  const iconMap: Record<FeedbackCategory, React.ReactNode> = {
                    eye_contact: <Eye className="w-3.5 h-3.5" />,
                    posture: <User className="w-3.5 h-3.5" />,
                    head_tilt: <Move className="w-3.5 h-3.5" />,
                    expression: <Smile className="w-3.5 h-3.5" />,
                    proximity: <ZoomIn className="w-3.5 h-3.5" />,
                    fidgeting: <Move className="w-3.5 h-3.5" />,
                    positive: <CheckCircle2 className="w-3.5 h-3.5" />,
                    face_missing: <CircleAlert className="w-3.5 h-3.5" />,
                  };
                  const labelMap: Record<FeedbackCategory, string> = {
                    eye_contact: 'Eye Contact',
                    posture: 'Posture',
                    head_tilt: 'Head Position',
                    expression: 'Expression',
                    proximity: 'Camera Distance',
                    fidgeting: 'Movement',
                    positive: 'Great Job!',
                    face_missing: 'Visibility',
                  };
                  const severityStyles = {
                    success: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
                    warning: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
                    info: 'bg-sky-500/10 border-sky-500/25 text-sky-400',
                  };
                  const labelStyles = {
                    success: 'text-emerald-400',
                    warning: 'text-amber-400',
                    info: 'text-sky-400',
                  };
                  return (
                    <div key={index} className={`p-2.5 rounded-xl animate-slideInLeft border ${severityStyles[tip.severity]}`}>
                      <div className={`flex items-center gap-1.5 mb-0.5 ${labelStyles[tip.severity]}`}>
                        {iconMap[tip.category]}
                        <span className="font-bold text-xs">{labelMap[tip.category]}</span>
                      </div>
                      <span className="text-foreground text-xs leading-relaxed">{tip.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Transcript */}
          <div className="flex-1 bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col min-h-0">
            <h2 className="text-sm font-extrabold flex items-center gap-2 mb-2 shrink-0 border-b border-border/50 pb-2">
              <Mic className="w-4 h-4 text-primary" /> Live Transcript
              <span className="text-xs font-normal text-muted-foreground ml-auto">{transcript.length} msgs</span>
            </h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
                   <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin"></div>
                   <p>Waiting for the interview to begin...</p>
                </div>
              ) : (
                transcript.map((message, index) => (
                  <div key={index} className={`flex flex-col ${message.speaker === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
                    <span className="text-[10px] font-bold text-muted-foreground mb-1 px-1 uppercase tracking-wider">
                       {message.speaker === 'user' ? '🎤 You' : '🤖 AI Coach'}
                    </span>
                    <div className={`p-3 rounded-2xl max-w-[90%] text-[13px] leading-relaxed shadow-sm ${
                        message.speaker === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-muted text-foreground border border-border/50 rounded-tl-sm'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Control Bar */}
      <footer className="bg-background border-t border-border px-4 md:px-6 py-3 flex items-center justify-between shrink-0 gap-3">
         
         <div className="flex items-center gap-3">
           <span className="text-xs text-muted-foreground">
             <span className="font-medium">{questionNumber}</span>/15 questions
           </span>
         </div>

         {/* Center: Recording Controls */}
         <div className="flex items-center gap-3">
           {isRecording && (
             <button 
               onClick={onStopRecording}
               className="flex items-center gap-2 bg-red-500 text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 animate-fadeIn"
             >
               <Square className="w-4 h-4 fill-current" /> Submit Answer
             </button>
           )}
           
           {isProcessing && (
             <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-5 py-2.5 rounded-full font-bold text-sm border border-yellow-500/20">
               <Loader2 className="w-4 h-4 animate-spin" /> Processing your answer...
             </div>
           )}

           {isSpeaking && (
             <div className="flex items-center gap-2 bg-secondary/10 text-secondary px-5 py-2.5 rounded-full font-bold text-sm border border-secondary/20">
               <Volume2 className="w-4 h-4" /> AI is speaking...
             </div>
           )}

           {/* Small text input toggle */}
           {!isRecording && !isProcessing && !isSpeaking && (
             <>
               {showTextInput ? (
                 <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
                   <input
                     ref={inputRef}
                     type="text"
                     value={manualText}
                     onChange={e => setManualText(e.target.value)}
                     placeholder="Type answer..."
                     className="w-64 bg-muted border border-border rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                   />
                   <button type="submit" disabled={!manualText.trim()} className="bg-primary text-primary-foreground p-2 rounded-full disabled:opacity-40">
                     <Send className="w-4 h-4" />
                   </button>
                 </form>
               ) : (
                 <button 
                   onClick={() => { setShowTextInput(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                   className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-medium"
                 >
                   <Keyboard className="w-3.5 h-3.5" /> Type instead
                 </button>
               )}
             </>
           )}
         </div>
         
         {/* End Interview */}
         {showEndConfirm ? (
           <div className="flex items-center gap-2 animate-fadeIn">
             <button 
               onClick={() => { setShowEndConfirm(false); onEndInterview(); }}
               className="bg-destructive text-destructive-foreground px-4 py-2 rounded-full font-bold text-xs"
             >
               Yes, End
             </button>
             <button 
               onClick={() => setShowEndConfirm(false)}
               className="bg-muted text-foreground px-4 py-2 rounded-full font-bold text-xs"
             >
               No
             </button>
           </div>
         ) : (
           <button 
             onClick={() => setShowEndConfirm(true)}
             className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground px-4 py-2 rounded-full font-bold flex items-center gap-1.5 transition-all text-xs shrink-0"
           >
              <PhoneOff className="w-3.5 h-3.5" /> End Interview
           </button>
         )}
      </footer>
    </div>
  );
};