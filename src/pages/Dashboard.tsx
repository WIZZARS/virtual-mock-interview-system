import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { 
  BarChart3, LayoutDashboard, LineChart, Target, Zap, 
  History, Trophy, Award, Calendar, Loader2, LogOut, 
  X, Eye, Mic, ChevronRight, ExternalLink
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from "recharts";
import { useAuthStore } from "../store/useAuthStore";
import { supabase } from "../lib/supabase";
import { LogoWordmark, ThemeToggle } from "../components/Logo";

export default function Dashboard() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sessions'>('dashboard');

  useEffect(() => {
    if (user) {
      supabase.from('session_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
           if (error) console.error(error);
           setSessions(data || []);
           setLoading(false);
        });
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
     return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center text-primary">
         <Loader2 className="w-10 h-10 animate-spin mb-4" /> 
         <span className="text-muted-foreground">Loading your dashboard...</span>
       </div>
     );
  }

  // Compute Stats
  const totalSessions = sessions.length;
  const averageScore = totalSessions > 0 
    ? (sessions.reduce((acc, s) => acc + (s.score_overall || 0), 0) / totalSessions).toFixed(1) 
    : "0.0";
  const bestScore = totalSessions > 0 
    ? Math.max(...sessions.map(s => s.score_overall || 0)).toFixed(1) 
    : "0.0";
  
  // Format data for Recharts
  const chartData = sessions.map(s => ({
    date: new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: s.score_overall,
    track: s.track,
    diff: s.difficulty
  }));

  // Badge Logic
  const hasEyeContactPro = sessions.some(s => (s.score_body_language || s.score_eye_contact) >= 9.0);
  const has90Club = sessions.some(s => s.score_overall >= 9.0);
  const has5Streak = totalSessions >= 5;

  return (
    <div className="min-h-screen bg-background flex">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur flex flex-col py-6 shrink-0">
        <div className="px-6 mb-8 mt-2">
          <LogoWordmark size={36} />
        </div>
        
        <nav className="flex-1 px-3 space-y-1">
           <button 
             onClick={() => setActiveTab('dashboard')}
             className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-colors text-sm ${
               activeTab === 'dashboard' 
                 ? 'bg-primary/10 text-primary font-bold border border-primary/20' 
                 : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
             }`}
           >
             <LayoutDashboard className="w-5 h-5" /> Dashboard
           </button>
           <button 
             onClick={() => setActiveTab('sessions')}
             className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-xl transition-colors text-sm ${
               activeTab === 'sessions' 
                 ? 'bg-primary/10 text-primary font-bold border border-primary/20' 
                 : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
             }`}
           >
             <History className="w-5 h-5" /> Past Sessions
           </button>
        </nav>

        {/* User Info + Sign Out */}
        <div className="px-4 pt-4 border-t border-border mt-auto space-y-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Appearance</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto space-y-8 animate-fadeInUp">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
                {activeTab === 'dashboard' ? 'Welcome Back! 👋' : 'Past Sessions'}
              </h1>
              <p className="text-muted-foreground">
                {activeTab === 'dashboard' 
                  ? (totalSessions === 0 ? "You haven't completed any interviews yet. Let's practice!" : "Your interview performance overview.")
                  : `${totalSessions} interview sessions recorded.`
                }
              </p>
            </div>
            <Link to="/setup" className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 text-sm">
              + New Practice <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {activeTab === 'dashboard' && (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Sessions" value={totalSessions} icon={<History className="w-5 h-5" />} />
                <StatCard title="Average Score" value={averageScore} suffix="/10" icon={<BarChart3 className="w-5 h-5" />} />
                <StatCard title="Best Score" value={bestScore} icon={<StarIcon />} special />
                <StatCard title="Consistency" value={`${totalSessions}`} suffix=" sessions" icon={<Zap className="w-5 h-5" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Area */}
                <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-bold flex items-center gap-2"><LineChart className="w-5 h-5 text-primary" /> Performance Growth</h2>
                  </div>
                  <div className="h-[280px] w-full">
                    {totalSessions === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl text-muted-foreground">
                         <Target className="w-8 h-8 mb-2 opacity-50" />
                         <p className="text-sm">Complete your first session to unlock charts!</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: "hsl(var(--muted-foreground))", fontSize: 12}} dy={10} />
                          <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{fill: "hsl(var(--muted-foreground))", fontSize: 12}} dx={-10} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                            itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Badges Area */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col">
                  <h2 className="text-lg font-bold flex items-center gap-2 mb-5"><Award className="w-5 h-5 text-secondary" /> Badges</h2>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <BadgeItem
                      icon={<Eye className="w-6 h-6" />}
                      title="Eye Contact Pro"
                      earned={hasEyeContactPro}
                      color="secondary"
                    />
                    <BadgeItem
                      icon={<StarIcon className="w-6 h-6" />}
                      title="90+ Club"
                      earned={has90Club}
                      color="yellow"
                    />
                    <div className="col-span-2">
                      <BadgeItem
                        icon={<Zap className="w-5 h-5" />}
                        title={`5-Session Streak ${!has5Streak ? '(Locked)' : ''}`}
                        earned={has5Streak}
                        color="primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Session History Table — shown in both tabs, but featured in 'sessions' tab */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
             <h2 className="text-lg font-bold mb-5">
               {activeTab === 'sessions' ? 'All Sessions' : 'Recent Sessions'}
             </h2>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-border text-muted-foreground font-medium text-xs uppercase tracking-wider">
                     <th className="pb-3 font-medium">Date</th>
                     <th className="pb-3 font-medium">Track</th>
                     <th className="pb-3 font-medium">Level</th>
                     <th className="pb-3 font-medium text-right">Score</th>
                     <th className="pb-3 font-medium text-center">Report</th>
                   </tr>
                 </thead>
                 <tbody>
                   {sessions.length === 0 ? (
                     <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No sessions recorded yet. Start your first practice!</td></tr>
                   ) : (
                     sessions.slice().reverse().slice(0, activeTab === 'sessions' ? undefined : 5).map(session => (
                       <tr key={session.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                         <td className="py-3.5 flex items-center gap-2 text-sm">
                           <Calendar className="w-4 h-4 text-muted-foreground" /> 
                           {new Date(session.created_at).toLocaleDateString()}
                         </td>
                         <td className="py-3.5 font-medium text-sm">{session.track}</td>
                         <td className="py-3.5">
                           <span className="px-2.5 py-1 bg-muted rounded-full text-xs font-semibold">{session.difficulty}</span>
                         </td>
                         <td className="py-3.5 text-right">
                           <span className={`font-bold ${session.score_overall >= 8 ? 'text-green-400' : session.score_overall >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                             {session.score_overall?.toFixed(1) || '0.0'}
                           </span>
                         </td>
                         <td className="py-3.5 text-center">
                            <button 
                              onClick={() => setSelectedReport(session)}
                              className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                            >
                              View <ExternalLink className="w-3 h-3" />
                            </button>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>

        </div>
      </main>

      {/* Report Modal */}
      {selectedReport && (
        <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </div>
  )
}

function ReportModal({ report, onClose }: { report: any; onClose: () => void }) {
  const data = report.report_json || {};
  const scores = data.scores || {};
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-fadeInUp" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-extrabold">Session Report</h2>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-bold">{report.track}</span>
              <span className="bg-muted px-2 py-1 rounded-md font-semibold">{report.difficulty}</span>
              <span className="bg-muted px-2 py-1 rounded-md">{new Date(report.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Score */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 text-center">
          <div className="text-xs font-bold text-primary tracking-widest uppercase mb-1">Overall Score</div>
          <div className="text-5xl font-black">{scores.overall || report.score_overall?.toFixed(1)}</div>
          <div className="text-sm text-muted-foreground mt-1">out of 10</div>
        </div>

        {/* Score Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <ScoreItem label="Communication" value={scores.communication || report.score_communication} />
          <ScoreItem label="Confidence" value={scores.confidence || report.score_confidence} />
          <ScoreItem label="Body Language" value={scores.bodyLanguage || report.score_body_language} />
          <ScoreItem label="Speaking Pace" value={scores.speakingPace || report.score_speaking_pace} />
        </div>

        {/* Summary */}
        {data.overallSummary && (
          <div className="mb-6">
            <h3 className="font-bold text-sm mb-2">Summary</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.overallSummary}</p>
          </div>
        )}

        {/* Tips */}
        {data.improvementTips && data.improvementTips.length > 0 && (
          <div>
            <h3 className="font-bold text-sm mb-3">Improvement Tips</h3>
            <div className="space-y-2">
              {data.improvementTips.map((tip: string, i: number) => (
                <div key={i} className="flex gap-2 text-sm text-muted-foreground">
                  <span className="bg-primary/20 text-primary w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i+1}</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreItem({ label, value }: { label: string; value?: number }) {
  const v = value || 0;
  const color = v >= 8 ? 'text-green-400' : v >= 6 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex justify-between items-center">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={`font-extrabold text-lg ${color}`}>{v?.toFixed?.(1) || v}</span>
    </div>
  );
}

function StatCard({ title, value, icon, suffix = "", special = false }: any) {
  return (
    <div className={`p-5 rounded-2xl border ${special ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20' : 'bg-card border-border shadow-sm hover:shadow-md transition-shadow'}`}>
      <div className="flex justify-between items-start mb-3">
        <p className={`text-xs font-medium ${special ? 'opacity-80' : 'text-muted-foreground'}`}>{title}</p>
        <div className={`p-1.5 rounded-lg ${special ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <h3 className="text-3xl font-extrabold tracking-tight">{value}</h3>
        {suffix && <span className={`font-semibold text-sm ${special ? 'text-white/80' : 'text-muted-foreground'}`}>{suffix}</span>}
      </div>
    </div>
  )
}

function BadgeItem({ icon, title, earned, color }: { icon: React.ReactNode; title: string; earned: boolean; color: string }) {
  const colorMap: Record<string, string> = {
    secondary: earned ? 'bg-secondary/10 border-secondary/50' : '',
    yellow: earned ? 'bg-yellow-500/10 border-yellow-500/50' : '',
    primary: earned ? 'bg-primary/10 border-primary/50' : '',
  };
  const iconColorMap: Record<string, string> = {
    secondary: earned ? 'text-secondary' : 'text-muted-foreground',
    yellow: earned ? 'text-yellow-500' : 'text-muted-foreground',
    primary: earned ? 'text-primary' : 'text-muted-foreground',
  };
  
  return (
    <div className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
      earned ? colorMap[color] : 'bg-muted/30 border-border/50 grayscale opacity-50'
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
        earned ? `bg-${color === 'yellow' ? 'yellow-500' : color}/20` : 'bg-muted'
      }`}>
        <span className={iconColorMap[color]}>{icon}</span>
      </div>
      <h4 className="font-bold text-xs">{title}</h4>
    </div>
  );
}

function StarIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
}
