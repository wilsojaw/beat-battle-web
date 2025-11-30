'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 *
 * Prevents the entire app from crashing when a component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details with more context
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error message:', error.message);
    console.error('[ErrorBoundary] Error stack:', error.stack);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // You could also log to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    // Reset error state and try to recover
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-4xl font-bold text-red-600 mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-xl text-gray-600">
                The app encountered an unexpected error
              </p>
            </div>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-bold text-red-800 mb-2">Error Details:</h3>
                <pre className="text-xs text-red-700 overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <>
                    <h3 className="font-bold text-red-800 mt-4 mb-2">Stack Trace:</h3>
                    <pre className="text-xs text-red-700 overflow-auto max-h-60">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}

            {/* Recovery Actions */}
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
              >
                Try Again
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Go to Home Page
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> If this error persists, try:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Refreshing the page</li>
                <li>Clearing your browser cache</li>
                <li>Checking your internet connection</li>
                <li>Using a different browser</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
