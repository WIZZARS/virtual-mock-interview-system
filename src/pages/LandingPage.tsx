import React, { useRef } from "react";
import { Link } from "react-router";
import { Mic, Eye, BarChart, History, PlayCircle, Star, ShieldCheck, Zap, ArrowRight, CheckCircle2, Users, Sparkles } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

export default function LandingPage() {
  const featuresRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden transition-colors duration-300">
      
      {/* Decorative Gradients */}
      <div className="fixed top-[-15%] left-[-10%] w-[40%] h-[40%] bg-primary/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-secondary/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed top-[50%] left-[50%] w-[30%] h-[30%] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="border-b border-border/40 px-6 md:px-8 py-4 flex justify-between items-center glass-strong sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-xl text-primary-foreground">
            <Mic className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl md:text-2xl tracking-tight text-foreground">InterviewIQ</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="#features" onClick={scrollToFeatures} className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground hidden md:block">Features</a>
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground">Dashboard</Link>
              <Link to="/setup" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all">
                New Practice
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground">Login</Link>
              <Link to="/setup" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center pt-16 md:pt-24 pb-16 px-6 relative z-10 w-full max-w-7xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary mb-6 text-sm font-medium">
            <Sparkles className="w-4 h-4" /> Powered by Gemini AI
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-foreground">
            Ace Every Interview. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary">
              Practice with AI.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Your AI interview coach that listens, responds, and gives real-time behavioral feedback on your eye contact, posture, and communication skills. Just like practicing with a real mentor — but available anytime.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              to="/setup" 
              className="group relative flex items-center justify-center gap-2 bg-foreground text-background px-8 py-4 rounded-full text-lg font-bold shadow-xl shadow-foreground/10 hover:shadow-2xl hover:scale-[1.02] transition-all"
            >
              <PlayCircle className="w-5 h-5 group-hover:text-primary transition-colors" />
              Start Free Practice
              <ArrowRight className="w-5 h-5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
            </Link>
            <Link 
              to="/login" 
              className="flex items-center justify-center gap-2 bg-card border border-border/50 text-foreground px-8 py-4 rounded-full text-lg font-bold hover:bg-muted/50 transition-all"
            >
              View Dashboard
            </Link>
          </div>
        </div>

        {/* How it Works */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 stagger-children">
          <div className="flex flex-col items-center justify-center p-6 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl hover:border-primary/30 transition-colors group">
            <span className="text-4xl font-extrabold text-primary mb-2 group-hover:scale-110 transition-transform">1</span>
            <h3 className="font-bold text-lg mb-1">Pick Your Topic</h3>
            <p className="text-muted-foreground text-sm text-center">Choose HR, Technical, or paste a custom Job Description.</p>
          </div>
          <div className="flex flex-col items-center justify-center p-6 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl hover:border-primary/30 transition-colors group">
            <span className="text-4xl font-extrabold text-primary mb-2 group-hover:scale-110 transition-transform">2</span>
            <h3 className="font-bold text-lg mb-1">Talk to Your AI Coach</h3>
            <p className="text-muted-foreground text-sm text-center">Real-time voice conversation with instant feedback on each answer.</p>
          </div>
          <div className="flex flex-col items-center justify-center p-6 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl hover:border-primary/30 transition-colors group">
            <span className="text-4xl font-extrabold text-primary mb-2 group-hover:scale-110 transition-transform">3</span>
            <h3 className="font-bold text-lg mb-1">Get Your Report</h3>
            <p className="text-muted-foreground text-sm text-center">Detailed performance report with actionable improvement tips.</p>
          </div>
        </div>

        {/* Why InterviewIQ — value proposition */}
        <div className="w-full bg-card/30 border border-border/30 rounded-3xl p-8 md:p-12 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
                Practice makes <span className="text-primary">perfect</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Most people find it hard to express themselves in front of an interviewer. InterviewIQ gives you a safe space to practice as many times as you want — the AI coach gives feedback on every answer, just like a real mentor would.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  <span className="text-sm">Practice unlimited times, no judgment</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  <span className="text-sm">Get instant feedback on every response</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  <span className="text-sm">Track your progress over multiple sessions</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  <span className="text-sm">Upload your resume for personalized questions</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-64 h-64 md:w-72 md:h-72 rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/5 border border-border/50 flex flex-col items-center justify-center p-6 animate-float">
                  <Users className="w-16 h-16 text-primary/60 mb-4" />
                  <div className="text-center">
                    <div className="text-4xl font-black text-foreground">15</div>
                    <div className="text-sm text-muted-foreground mt-1">AI-guided questions per session</div>
                    <div className="text-xs text-muted-foreground mt-0.5">30-40 min interview simulation</div>
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                  Free to use
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div ref={featuresRef} id="features" className="w-full scroll-mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">Why InterviewIQ?</h2>
            <p className="text-muted-foreground mt-4 text-lg">Professional interview coaching tools — available for free.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            <FeatureCard 
              icon={<Eye className="w-8 h-8 text-secondary" />}
              title="Live Behavioral Coaching"
              description="MediaPipe vision engine analyzes your webcam feed to coach you on eye contact and posture in real-time."
            />
            <FeatureCard 
              icon={<Mic className="w-8 h-8 text-primary" />}
              title="Voice Conversation"
              description="Natural voice-to-voice conversation with the AI. It speaks, you speak — just like a real interview."
            />
            <FeatureCard 
              icon={<BarChart className="w-8 h-8 text-secondary" />}
              title="Detailed Score Report"
              description="Get 0-10 breakdowns for communication, confidence, body language, and more with actionable tips."
            />
            <FeatureCard 
              icon={<History className="w-8 h-8 text-primary" />}
              title="Progress Tracking"
              description="Dashboard charts track how much you improve session after session. See your growth over time."
            />
            <FeatureCard 
              icon={<Star className="w-8 h-8 text-secondary" />}
              title="Achievement Badges"
              description="Earn badges like 'Eye Contact Pro' and '90+ Club' to stay motivated and challenge yourself."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-8 h-8 text-primary" />}
              title="Resume & JD-Aware"
              description="Upload your resume or paste a Job Description — the AI tailors questions specifically for your profile."
            />
          </div>
        </div>
      </main>
      
      <footer className="border-t border-border/40 py-8 text-center text-muted-foreground bg-background">
        <p className="text-sm">© 2026 InterviewIQ. Built for students and job seekers. <span className="text-primary font-medium">Practice → Improve → Ace it.</span></p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group p-7 rounded-3xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
      <div className="bg-muted p-3.5 rounded-2xl w-fit mb-5 group-hover:scale-110 group-hover:bg-primary/10 transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">
        {description}
      </p>
    </div>
  )
}
