import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import LandingPage from "./pages/LandingPage";
import SetupScreen from "./pages/SetupScreen";
import Dashboard from "./pages/Dashboard";
import LoginScreen from "./pages/LoginScreen";
import InterviewApp from "../App";
import { useAuthStore } from "./store/useAuthStore";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-muted-foreground text-sm font-medium animate-pulse">Authenticating...</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function MainRouter() {
  const initialize = useAuthStore(s => s.initialize);
  
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/setup" element={<SetupScreen />} />
        
        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Interview Route — accessible without login for guest practice */}
        <Route path="/interview" element={<InterviewApp />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  )
}
