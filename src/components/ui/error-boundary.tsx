import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center p-8 min-h-[200px]">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 rounded-xl bg-titan-magenta/10 border border-titan-magenta/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-titan-magenta" />
            </div>
            <h3 className="font-display font-bold text-sm text-white mb-1">
              Something went wrong
            </h3>
            <p className="font-mono text-xs text-white/40 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-titan-cyan/10 border border-titan-cyan/20 font-mono text-xs text-titan-cyan hover:bg-titan-cyan/15 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
