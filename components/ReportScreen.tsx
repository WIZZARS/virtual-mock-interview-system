import React, { useRef, useEffect, useState } from 'react';
import { Download, RefreshCcw, Award, MessageSquare, ShieldCheck, UserCheck, Eye, LayoutDashboard, Gauge, TrendingUp, Lightbulb, Trophy, ArrowRight, BarChart2, BookOpen, Target, ChevronDown, ChevronUp, Star, HelpCircle } from 'lucide-react';
import { useInterviewStore } from '../src/store/useInterviewStore';

interface ReportScreenProps {
  report: string;
  onDownload: () => void;
  onRestart: () => void;
  onDashboard?: () => void;
  startTime?: number;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({ report, onRestart, onDashboard, startTime }) => {
  const { track, difficulty } = useInterviewStore();
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  let data: any = {};
  try {
    data = JSON.parse(report);
  } catch(e) {
    console.error("Failed to parse JSON report:", e);
  }

  const scores = data?.scores || { communication: 0, confidence: 0, bodyLanguage: 0, eyeContact: 0, speakingPace: 0, overall: 0 };
  
  const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
  const durationStr = duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : 'N/A';

  // Actual PDF download using html2pdf.js
  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = reportContentRef.current;
      if (!element) return;
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `InterviewIQ_Report_${track}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          backgroundColor: '#0a0f1a'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch(e) {
      console.error("PDF generation failed:", e);
      // Fallback: download as JSON
      const blob = new Blob([report], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'interview_report.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 font-sans flex justify-center overflow-x-hidden">
      
      <div className="w-full max-w-5xl space-y-8 animate-fadeInUp">
        
        {/* Report Content — this is what gets exported to PDF */}
        <div ref={reportContentRef}>
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-card border border-border p-8 rounded-3xl shadow-sm">
             <div className="flex-1">
               <div className="flex items-center gap-3 mb-4 text-sm font-bold text-muted-foreground flex-wrap">
                  <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg">{track} Track</span>
                  <span className="bg-muted px-3 py-1.5 rounded-lg">{difficulty}</span>
                  <span className="bg-muted px-3 py-1.5 rounded-lg">{durationStr}</span>
                  <span className="bg-secondary/10 text-secondary px-3 py-1.5 rounded-lg">AI Assessed</span>
               </div>
               <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">Performance Report</h1>
               <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">{data.overallSummary}</p>
             </div>
             
             <div className="flex flex-col items-center bg-primary/5 border border-primary/20 p-6 rounded-2xl w-full md:w-auto shrink-0">
               <div className="text-xs font-bold text-primary mb-1 tracking-widest uppercase">Overall Score</div>
               <AnimatedScore value={scores.overall} />
               <div className="text-sm text-muted-foreground font-medium mt-1">out of 10</div>
             </div>
          </div>

          {/* Score Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 stagger-children">
             <ScoreCard title="Communication" score={scores.communication} icon={<MessageSquare className="w-4 h-4" />} />
             <ScoreCard title="Confidence" score={scores.confidence} icon={<Trophy className="w-4 h-4" />} />
             <ScoreCard title="Body Language" score={scores.bodyLanguage} icon={<UserCheck className="w-4 h-4" />} />
             <ScoreCard title="Eye Contact" score={scores.eyeContact} icon={<Eye className="w-4 h-4" />} />
             <ScoreCard title="Speaking Pace" score={scores.speakingPace} icon={<Gauge className="w-4 h-4" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              
              {/* Score Breakdown Bars (Left side) */}
              <div className="lg:col-span-1 space-y-3">
                 <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                   <TrendingUp className="text-secondary w-5 h-5" /> Score Bars
                 </h3>
                 <ScoreBar title="Communication" score={scores.communication} />
                 <ScoreBar title="Confidence" score={scores.confidence} />
                 <ScoreBar title="Body Language" score={scores.bodyLanguage} />
                 <ScoreBar title="Eye Contact" score={scores.eyeContact} />
                 <ScoreBar title="Speaking Pace" score={scores.speakingPace} />
              </div>

              {/* Detailed Analysis (Right side) */}
              <div className="lg:col-span-2 space-y-4">
                 <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                   <Award className="text-primary w-5 h-5" /> Detailed Analysis
                 </h3>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
                   <AnalysisCard title="Communication" text={data?.detailedAnalysis?.communication} />
                   <AnalysisCard title="Confidence" text={data?.detailedAnalysis?.confidence} />
                   <AnalysisCard title="Body Language" text={data?.detailedAnalysis?.bodyLanguage} />
                   <AnalysisCard title="Eye Contact" text={data?.detailedAnalysis?.eyeContact} />
                   <AnalysisCard title="Speaking Pace" text={data?.detailedAnalysis?.speakingPace} className="sm:col-span-2" />
                 </div>
              </div>
          </div>

          {/* Strengths */}
          {data?.strengths && data.strengths.length > 0 && (
            <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 mt-8">
               <h4 className="font-bold text-lg mb-4 text-secondary flex items-center gap-2">
                 <ShieldCheck className="w-5 h-5" /> Your Strengths
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 {data.strengths.map((s: string, i: number) => (
                   <div key={i} className="flex gap-3 p-3 bg-card rounded-xl border border-border/50">
                     <span className="bg-secondary/20 text-secondary w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0">✓</span>
                     <span className="text-sm leading-relaxed text-foreground">{s}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* Improvement Tips */}
          {data?.improvementTips && data.improvementTips.length > 0 && (
            <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 mt-6">
               <h4 className="font-bold text-lg mb-4 text-foreground flex items-center gap-2">
                 <Lightbulb className="w-5 h-5 text-yellow-500" /> Actionable Improvement Tips
               </h4>
               <div className="space-y-3">
                 {data.improvementTips.map((tip: string, i: number) => (
                   <div key={i} className="flex gap-3 items-start">
                     <span className="bg-primary/20 text-primary w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{i+1}</span>
                     <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* ── STAR Structure Breakdown (Behavioral STAR track only) ────── */}
          {data?.starStructureAnalysis && (
            <div className="bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-500/20 rounded-2xl p-6 mt-6">
              <h4 className="font-bold text-lg mb-1 text-violet-400 flex items-center gap-2">
                <Star className="w-5 h-5 fill-violet-400" /> STAR Structure Breakdown
              </h4>
              <p className="text-xs text-muted-foreground mb-5">How well you used the Situation → Task → Action → Result framework across your answers.</p>

              {/* Overall STAR score */}
              <div className="flex items-center gap-4 mb-6 bg-card border border-border rounded-2xl p-4">
                <div className="flex flex-col items-center bg-violet-500/10 rounded-xl p-4 min-w-[90px]">
                  <span className="text-xs font-bold text-violet-400 mb-1 tracking-widest uppercase">STAR Score</span>
                  <span className={`text-4xl font-black ${data.starStructureAnalysis.overallStarScore >= 7 ? 'text-green-400' : data.starStructureAnalysis.overallStarScore >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {data.starStructureAnalysis.overallStarScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 10</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{data.starStructureAnalysis.starFeedback}</p>
              </div>

              {/* Individual component bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Situation', key: 'situationScore', letter: 'S', desc: 'Context setting' },
                  { label: 'Task', key: 'taskScore', letter: 'T', desc: 'Personal responsibility' },
                  { label: 'Action', key: 'actionScore', letter: 'A', desc: 'Steps you personally took' },
                  { label: 'Result', key: 'resultScore', letter: 'R', desc: 'Measurable outcome' },
                ].map(({ label, key, letter, desc }) => {
                  const score = data.starStructureAnalysis[key] ?? 0;
                  const isHigh = score >= 7;
                  const isMed = score >= 5 && score < 7;
                  const colorBar = isHigh ? 'bg-green-500' : isMed ? 'bg-yellow-500' : 'bg-red-500';
                  const colorText = isHigh ? 'text-green-400' : isMed ? 'text-yellow-400' : 'text-red-400';
                  return (
                    <div key={key} className="bg-card border border-border p-4 rounded-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-violet-500/20 text-violet-400 w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0">{letter}</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-baseline">
                            <span className="font-bold text-sm">{label}</span>
                            <span className={`font-extrabold text-sm ${colorText}`}>{score}/10</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className={`h-full ${colorBar} rounded-full animate-barGrow`} style={{ width: `${score * 10}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Ambiguity Training Analysis ───────────────────────────────────────── */}
          {data?.ambiguityAnalysis && (
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6 mt-6">
              <h4 className="font-bold text-lg mb-1 text-orange-500 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" /> Ambiguity Handling
              </h4>
              <p className="text-xs text-muted-foreground mb-5">How well you asked clarifying questions when presented with under-specified scenarios.</p>

              <div className="flex items-center gap-4 bg-card border border-border rounded-2xl p-4">
                <div className="flex flex-col items-center bg-orange-500/10 rounded-xl p-4 min-w-[90px]">
                  <span className="text-xs font-bold text-orange-500 mb-1 tracking-widest uppercase">Score</span>
                  <span className={`text-4xl font-black ${data.ambiguityAnalysis.clarificationScore >= 7 ? 'text-green-400' : data.ambiguityAnalysis.clarificationScore >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {data.ambiguityAnalysis.clarificationScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 10</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{data.ambiguityAnalysis.feedback}</p>
              </div>
            </div>
          )}

          {/* ── Industry Benchmark ───────────────────────────────────────── */}
          {data?.industryBenchmark && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 mt-6">
              <h4 className="font-bold text-lg mb-3 text-blue-400 flex items-center gap-2">
                <BarChart2 className="w-5 h-5" /> Industry Benchmark
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.industryBenchmark}</p>
            </div>
          )}

          {/* ── Question Debrief ─────────────────────────────────────────── */}
          {data?.questionDebrief && data.questionDebrief.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 mt-6">
              <h4 className="font-bold text-lg mb-4 text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-secondary" /> Question Debrief
              </h4>
              <div className="space-y-3">
                {data.questionDebrief.map((item: any, i: number) => (
                  <DebriefCard key={i} index={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* ── Next Steps ───────────────────────────────────────────────── */}
          {data?.nextSteps && data.nextSteps.length > 0 && (
            <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-6 mt-6">
              <h4 className="font-bold text-lg mb-4 text-secondary flex items-center gap-2">
                <Target className="w-5 h-5" /> Your Next Steps
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.nextSteps.map((step: any, i: number) => (
                  <div key={i} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-secondary/20 text-secondary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0">{i+1}</span>
                      <span className="font-semibold text-sm text-foreground">{step.action}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-8">{step.resource}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
        {/* End of PDF-exportable content */}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 pb-8 border-t border-border/50 no-print">
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            className="flex items-center justify-center gap-3 bg-secondary text-secondary-foreground font-bold py-3.5 px-8 rounded-full hover:scale-105 hover:shadow-lg hover:shadow-secondary/20 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <Download className="w-5 h-5" />
            {pdfLoading ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-3 bg-card border border-border text-foreground font-bold py-3.5 px-8 rounded-full hover:bg-muted transition-all"
          >
            <RefreshCcw className="w-5 h-5" />
            New Interview
          </button>
          {onDashboard && (
            <button
              onClick={onDashboard}
              className="flex items-center justify-center gap-3 bg-primary/10 border border-primary/20 text-primary font-bold py-3.5 px-8 rounded-full hover:bg-primary/20 transition-all"
            >
              <LayoutDashboard className="w-5 h-5" />
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

// Animated large score display
function AnimatedScore({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    let frame: number;
    const duration = 1200;
    const start = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Number((eased * value).toFixed(1)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  
  return (
    <div className="text-6xl font-black text-foreground drop-shadow-sm animate-countUp">
      {display}
    </div>
  );
}

function ScoreCard({ title, score, icon }: { title: string; score: number; icon: React.ReactNode }) {
  const color = score >= 8 ? 'text-green-400' : score >= 6 ? 'text-yellow-400' : 'text-red-400';
  
  return (
    <div className="bg-card border border-border rounded-2xl p-4 text-center hover:shadow-md transition-shadow">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <div className={`text-3xl font-extrabold ${color}`}>
        {score}
      </div>
    </div>
  );
}

function ScoreBar({ title, score }: { title: string; score: number }) {
  const isHigh = score >= 8;
  const isMed = score >= 5 && score < 8;
  const colorClass = isHigh ? 'bg-green-500' : isMed ? 'bg-yellow-500' : 'bg-red-500';
  const widthStr = `${score * 10}%`;

  return (
    <div className="bg-card border border-border p-3 rounded-xl">
      <div className="flex justify-between items-center mb-2">
         <span className="font-semibold text-xs text-foreground">{title}</span>
         <span className={`font-extrabold text-sm ${isHigh ? 'text-green-400' : isMed ? 'text-yellow-400' : 'text-red-400'}`}>
           {score}
         </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
         <div className={`h-full ${colorClass} rounded-full animate-barGrow`} style={{ width: widthStr }} />
      </div>
    </div>
  )
}

function AnalysisCard({ title, text, className = "" }: { title: string; text?: string; className?: string }) {
  return (
    <div className={`bg-card border border-border p-4 rounded-2xl ${className}`}>
       <h4 className="text-sm font-bold text-foreground mb-2">{title}</h4>
       <p className="text-sm text-muted-foreground leading-relaxed">{text || 'No analysis available.'}</p>
    </div>
  )
}

function DebriefCard({ index, item }: { index: number; item: { question: string; whyAsked: string; idealApproach: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">{index + 1}</span>
          <span className="text-sm font-medium text-foreground line-clamp-2">{item.question}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          <div>
            <p className="text-xs font-bold text-secondary mb-1">Why this was asked</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.whyAsked}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-primary mb-1">Ideal approach</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.idealApproach}</p>
          </div>
        </div>
      )}
    </div>
  );
}
