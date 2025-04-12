'use client';

import { useEffect } from 'react';

interface ErrorCatcherProps {
  pageName: string;
  children?: React.ReactNode;
}

/**
 * ErrorCatcher component that can be added to any page to ensure
 * error monitoring is properly initialized and errors are reported.
 */
export function ErrorCatcher({ pageName, children }: ErrorCatcherProps) {
  useEffect(() => {
    // Report that this page has loaded the error catcher
    try {
      fetch('/api/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'pageLoad',
          message: `Page "${pageName}" loaded with error monitoring`,
          timestamp: new Date().toISOString(),
          source: 'ErrorCatcher',
          url: window.location.href
        }),
      })
      .catch(() => {
        // Silently ignore fetch errors
      });
    } catch (e) {
      // Silently ignore errors to prevent loops
    }

    // Create a test error once to verify monitoring is working
    const testErrorTimeout = setTimeout(() => {
      try {
        // Log a benign error to test the monitoring
        console.error(`Test error from page: ${pageName}`);
      } catch (e) {
        // Ignore
      }
    }, 1000);

    return () => {
      clearTimeout(testErrorTimeout);
    };
  }, [pageName]);

  // This component doesn't render anything
  return children || null;
}