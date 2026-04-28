import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/useAuthStore";
import { Mic, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Auto-redirect if already logged in (e.g. after OAuth callback)
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("Success! Check your email for a confirmation link.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin + '/login' }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Decorative background */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />

      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 font-extrabold text-2xl tracking-tight z-50">
        <div className="bg-primary p-2 rounded-xl text-primary-foreground">
          <Mic className="w-5 h-5" />
        </div>
        InterviewIQ
      </Link>

      <div className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl relative z-10 animate-fadeInUp">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isSignUp ? "Sign up to save your interview history and track progress." : "Log in to access your dashboard and history."}
          </p>
        </div>

        {error && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${error.includes('Success') ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="you@domain.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 mt-4 hover:opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
          >
            {loading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-border w-full absolute"></div>
          <span className="bg-card px-4 text-xs font-semibold text-muted-foreground relative z-10">OR CONTINUE WITH</span>
        </div>


        <p className="text-center text-sm font-medium text-muted-foreground">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button onClick={() => setIsSignUp(!isSignUp)} className="ml-2 text-primary hover:underline font-bold">
            {isSignUp ? "Log In" : "Sign Up"}
          </button>
        </p>

        <div className="mt-5 pt-5 border-t border-border/50">
          <Link to="/setup" className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
            Skip login → Practice as guest
          </Link>
        </div>

      </div>
    </div>
  )
}
