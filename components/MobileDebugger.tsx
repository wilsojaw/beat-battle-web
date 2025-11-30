'use client';

import { useEffect } from 'react';

/**
 * MobileDebugger - Loads Eruda console for mobile debugging
 * Only loads in development or when explicitly enabled
 */
export function MobileDebugger() {
  useEffect(() => {
    // Only load on mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
      return;
    }

    function logGlobalError(event: ErrorEvent) {
      console.error('[MobileDebugger] Global error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack,
      });
    }

    function logUnhandledRejection(event: PromiseRejectionEvent) {
      console.error('[MobileDebugger] Unhandled rejection:', {
        reason: event.reason,
        stack: event.reason?.stack,
      });
    }

    window.addEventListener('error', logGlobalError);
    window.addEventListener('unhandledrejection', logUnhandledRejection);

    // Load Eruda script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/eruda';
    script.onload = () => {
      // Initialize Eruda after script loads
      if (window.eruda) {
        window.eruda.init();
      }
    };
    document.body.appendChild(script);

    return () => {
      window.removeEventListener('error', logGlobalError);
      window.removeEventListener('unhandledrejection', logUnhandledRejection);
      // Cleanup
      if (window.eruda) {
        window.eruda.destroy();
      }
    };
  }, []);

  return null;
}

// Type definition for eruda
declare global {
  interface Window {
    eruda?: {
      init: () => void;
      destroy: () => void;
    };
  }
}

