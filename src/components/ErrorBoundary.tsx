import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-ink text-text-primary min-h-screen flex items-center justify-center px-screen-gutter font-ui">
          <div className="text-center max-w-sm space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-screen-title text-xl font-black text-white">
                Something went wrong
              </h2>
              <p className="text-sm text-text-secondary">
                An unexpected error occurred while rendering this screen.
                Please try again.
              </p>
              {this.state.error && (
                <p className="text-xs text-text-tertiary font-mono bg-surface-raised rounded-lg p-3 mt-3 text-left break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>

            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ember text-ink font-extrabold text-sm active:scale-95 transition-transform shadow-[0_0_15px_rgba(255,122,26,0.3)] hover:bg-ember-press"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
