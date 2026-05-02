import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { 
  Briefcase, Code, User, ChevronRight, UploadCloud, 
  CheckCircle2, Video, Mic as MicIcon, VideoOff, Settings, FileText, X, Loader2,
  Building2, Rocket, Star, Layers, HelpCircle
} from "lucide-react";
import { useInterviewStore } from "../store/useInterviewStore";
import { ThemeToggle } from "../components/Logo";
import { cn } from "../lib/utils";

const TRACKS = [
  { id: "HR", title: "HR & Behavioral", icon: User, desc: "Culture fit, teamwork, and leadership questions.", badge: null },
  { id: "Technical", title: "Technical", icon: Code, desc: "Coding, architecture, and problem-solving.", badge: null },
  { id: "General", title: "General Mix", icon: Briefcase, desc: "A blend of all standard interview topics.", badge: null },
  { id: "FAANG Technical", title: "FAANG Technical", icon: Building2, desc: "DS&A, Big-O, edge cases — Google/Meta/Amazon style.", badge: "FAANG" },
  { id: "System Design", title: "System Design", icon: Layers, desc: "Scalability, distributed systems, and tradeoffs.", badge: "FAANG" },
  { id: "Startup Behavioral", title: "Startup Behavioral", icon: Rocket, desc: "Ownership, pragmatism, and culture fit for startups.", badge: "Startup" },
  { id: "Behavioral STAR", title: "Behavioral STAR", icon: Star, desc: "Pure behavioral questions using the STAR framework.", badge: null },
];

const DIFFICULTIES = [
  { id: "Fresher", label: "Fresher", desc: "Entry-level, 0-1 yrs" },
  { id: "Mid-Level", label: "Mid-Level", desc: "2-5 years experience" },
  { id: "Senior", label: "Senior", desc: "5+ years, leadership" }
];

export default function SetupScreen() {
  const navigate = useNavigate();
  const { 
    track, difficulty, jobDescription, resumeFileName, vagueMode,
    setTrack, setDifficulty, setJobDescription, setResumeFileName, setResumeText, setVagueMode
  } = useInterviewStore();
  
  // Media Preview State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeParsed, setResumeParsed] = useState(false);

  const testDevices = async () => {
    setMediaLoading(true);
    setMediaError("");

    try {
      stream?.getTracks().forEach(t => t.stop());
      const nextStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(nextStream);
      if (videoRef.current) {
        videoRef.current.srcObject = nextStream;
      }
    } catch (err) {
      console.error("Media permission denied", err);
      setMediaError("Camera and microphone permissions are required for the interview.");
    } finally {
      setMediaLoading(false);
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    setResumeFileName(file.name);
    setResumeLoading(true);
    setResumeParsed(false);
    
    try {
      // Use pdfjs-dist to extract text
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set the worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      setResumeText(fullText.trim());
      setResumeParsed(true);
      console.log(`Resume parsed: ${fullText.length} characters extracted from ${pdf.numPages} pages.`);
    } catch(err) {
      console.error("Failed to parse PDF:", err);
      // Still set the filename even if parsing fails
      setResumeText('');
    } finally {
      setResumeLoading(false);
    }
  };

  const clearResume = () => {
    setResumeFileName(null);
    setResumeText('');
    setResumeParsed(false);
  };

  const isReady = track !== null && difficulty !== null;

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6 animate-fadeInUp">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <Settings className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Interview Setup</h1>
              <p className="text-muted-foreground text-sm">Configure your AI interview coach session.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
              ← Home
            </Link>
          </div>
        </div>
        
        {/* Step 1: Track Selection */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <h2 className="text-lg font-bold flex items-center gap-3 mb-4">
            <span className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center text-sm font-black">1</span> 
            Select Interview Track
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {TRACKS.map((t) => {
              const Icon = t.icon;
              const isSelected = track === t.id;
              return (
                <button 
                  key={t.id}
                  onClick={() => setTrack(t.id)}
                  className={cn(
                    "relative p-5 border-2 flex flex-col items-start rounded-xl text-left transition-all duration-200 hover:scale-[1.02]",
                    isSelected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-border hover:border-primary/50 bg-background"
                  )}
                >
                  {isSelected && <CheckCircle2 className="absolute top-3 right-3 text-primary w-5 h-5 animate-fadeIn" />}
                  {t.badge && !isSelected && (
                    <span className={cn(
                      "absolute top-2 right-2 text-[10px] font-black px-1.5 py-0.5 rounded-md",
                      t.badge === 'FAANG' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                    )}>{t.badge}</span>
                  )}
                  <Icon className={cn("w-6 h-6 mb-3", isSelected ? "text-primary" : "text-muted-foreground")} />
                  <h3 className="font-bold text-sm">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Step 2: Difficulty */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <h2 className="text-lg font-bold flex items-center gap-3 mb-4">
             <span className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center text-sm font-black">2</span> 
             Select Experience Level
          </h2>
          <div className="grid grid-cols-3 gap-4">
             {DIFFICULTIES.map(level => (
               <button
                  key={level.id}
                  onClick={() => setDifficulty(level.id)}
                  className={cn(
                    "p-4 rounded-xl border-2 font-semibold transition-all text-left",
                    difficulty === level.id 
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "border-border hover:border-primary/50 text-foreground bg-background"
                  )}
               >
                 <div className="font-bold">{level.label}</div>
                 <div className={cn("text-xs mt-1", difficulty === level.id ? "text-white/70" : "text-muted-foreground")}>{level.desc}</div>
               </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 3 & 4: JD and Resume */}
          <div className="space-y-6">
            {/* Job Description */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">3</span>
                Job Description 
                <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
              </h2>
              <p className="text-xs text-muted-foreground mb-3">Paste the JD and the AI will ask role-specific questions.</p>
              <textarea 
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description or role requirements here..."
                className="w-full h-28 p-3 bg-background border border-border rounded-xl resize-none focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
              />
            </div>

            {/* Resume Upload */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
               <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                 <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">4</span>
                 Upload Resume 
                 <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
               </h2>
               <p className="text-xs text-muted-foreground mb-3">Upload your PDF resume for personalized questions based on your experience.</p>
               
               {resumeFileName ? (
                 <div className="border-2 border-primary/30 bg-primary/5 rounded-xl p-4 flex items-center gap-3">
                   <div className="bg-primary/10 p-2 rounded-lg">
                     <FileText className="w-6 h-6 text-primary" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="font-semibold text-sm truncate">{resumeFileName}</p>
                     <p className="text-xs text-muted-foreground">
                       {resumeLoading ? (
                         <span className="flex items-center gap-1 text-primary">
                           <Loader2 className="w-3 h-3 animate-spin" /> Extracting text...
                         </span>
                       ) : resumeParsed ? (
                         <span className="text-green-500">✓ Resume parsed successfully</span>
                       ) : (
                         'Uploaded'
                       )}
                     </p>
                   </div>
                   <button onClick={clearResume} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                     <X className="w-5 h-5" />
                   </button>
                 </div>
               ) : (
                 <label className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-background hover:bg-primary/5">
                    <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium">Click to upload PDF</span>
                    <span className="text-xs text-muted-foreground mt-1">PDF max 5MB</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleResumeUpload} />
                 </label>
               )}
            </div>

            {/* Advanced: Vague Mode */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-start gap-4 transition-all hover:border-orange-500/30">
              <div className="bg-orange-500/10 p-3 rounded-xl mt-1 shrink-0">
                <HelpCircle className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                    Ambiguity Training
                    <span className="bg-orange-500/20 text-orange-500 text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase">Advanced</span>
                  </h2>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={vagueMode}
                      onChange={(e) => setVagueMode(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  The AI will ask intentionally vague, under-specified questions. You must ask clarifying questions before answering to score well.
                </p>
              </div>
            </div>
          </div>

          {/* Step 5: Camera/Mic Test */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">5</span>
                Device Check
              </h2>
              <p className="text-xs text-muted-foreground mb-3">Ensure your face is clearly visible and centered.</p>
              
              <div className="flex-1 bg-black rounded-xl overflow-hidden relative border border-border flex items-center justify-center min-h-[250px]">
                 {mediaError ? (
                   <div className="text-center p-4">
                     <VideoOff className="w-10 h-10 text-destructive mx-auto mb-2" />
                     <p className="text-sm text-destructive font-medium">{mediaError}</p>
                     <p className="text-xs text-muted-foreground mt-2">Please allow camera and mic access in your browser settings.</p>
                     <button
                       onClick={testDevices}
                       disabled={mediaLoading}
                       className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                     >
                       {mediaLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                       Try Again
                     </button>
                   </div>
                 ) : stream ? (
                   <video 
                     ref={videoRef} 
                     autoPlay 
                     playsInline 
                     muted 
                     className="w-full h-full object-cover transform -scale-x-100" 
                   />
                 ) : (
                   <div className="text-center p-6">
                     <Video className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                     <p className="text-sm font-semibold text-white">Camera preview is off</p>
                     <p className="text-xs text-white/60 mt-1 mb-4">Test your camera and microphone before beginning.</p>
                     <button
                       onClick={testDevices}
                       disabled={mediaLoading}
                       className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
                     >
                       {mediaLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                       Test Devices
                     </button>
                   </div>
                 )}

                 {/* Status overlay */}
                 {!mediaError && stream && (
                   <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg">
                      <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                         <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]"></div>
                         System Ready
                      </div>
                      <div className="flex gap-3 text-white/80">
                         <MicIcon className="w-5 h-5" />
                         <Video className="w-5 h-5" />
                      </div>
                   </div>
                 )}
              </div>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
           <Link to="/" className="text-muted-foreground hover:text-foreground font-medium transition-colors text-sm">
              ← Go Back
           </Link>
           
           <button 
             onClick={() => {
                // Stop the preview stream before navigating
                if (stream) stream.getTracks().forEach(t => t.stop());
                navigate('/interview');
             }}
             disabled={!isReady}
             className={cn(
               "flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-bold transition-all shadow-xl",
               isReady 
                 ? "bg-primary text-primary-foreground hover:scale-[1.02] hover:shadow-primary/30 animate-pulseGlow" 
                 : "bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none"
             )}
           >
             Begin Interview <ChevronRight className="w-5 h-5" />
           </button>
        </div>

      </div>
    </div>
  )
}
