import React from 'react';

/**
 * Error boundary for route-level fault isolation (PERF-09 / FR-E4).
 * Catches JS errors in the subtree, logs them, and shows a friendly fallback
 * instead of an uncaught component stack blowing up the whole app.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8 text-center">
          <div className="max-w-md w-full space-y-4">
            <h1 className="font-abhaya text-2xl text-ink">Something went wrong</h1>
            <p className="text-muted text-sm leading-relaxed">
              The page hit an unexpected error. Please refresh or go back to the{' '}
              <a href="/" className="text-ink underline">homepage</a>.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-xs text-muted bg-surface border border-border rounded-md p-3 overflow-auto">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
