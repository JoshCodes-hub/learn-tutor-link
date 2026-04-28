import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { logClientError } from "@/lib/analytics";

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    // Persist for admin visibility (fire-and-forget)
    void logClientError({
      message: error.message || "Unknown error",
      stack: error.stack,
      component_stack: info.componentStack ?? undefined,
    });
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-background via-background to-muted/30">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">
            Something went wrong
          </h1>
          <p className="text-muted-foreground mb-8">
            An unexpected error stopped this screen from loading. Your data is safe — try again or head back home.
          </p>
          {this.state.error?.message && (
            <pre className="text-left text-xs text-muted-foreground bg-muted/40 border border-border/50 rounded-lg p-3 mb-6 overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={this.reset} variant="outline">
              <RotateCw className="w-4 h-4 mr-2" /> Try again
            </Button>
            <Button onClick={() => { window.location.href = "/"; }}>
              <Home className="w-4 h-4 mr-2" /> Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
