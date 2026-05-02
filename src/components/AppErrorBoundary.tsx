import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled app error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-5">
            The app hit an unexpected error. You can reload and continue from a clean state.
          </p>
          <pre className="mb-5 max-h-28 overflow-auto rounded-xl bg-muted p-3 text-left text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            <RefreshCcw className="h-4 w-4" />
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
