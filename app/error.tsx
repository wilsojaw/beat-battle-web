'use client';

import { useEffect } from 'react';

/**
 * Next.js Error Page
 *
 * Automatically rendered when an error occurs in a route segment
 * Works alongside ErrorBoundary for comprehensive error handling
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error('[Next.js Error Page]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-4xl font-bold text-red-600 mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-xl text-gray-600">
            We encountered an unexpected error
          </p>
        </div>

        {/* Error Details (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-bold text-red-800 mb-2">Error Details:</h3>
            <pre className="text-xs text-red-700 overflow-auto max-h-40">
              {error.message || error.toString()}
            </pre>
            {error.digest && (
              <p className="text-xs text-red-600 mt-2">
                Error Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Recovery Actions */}
        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg"
          >
            Try Again
          </button>

          <button
            onClick={() => (window.location.href = '/')}
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
