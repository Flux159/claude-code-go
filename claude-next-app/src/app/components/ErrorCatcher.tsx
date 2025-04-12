'use client';

import { useEffect } from 'react';

interface ErrorCatcherProps {
  pageName: string;
  children?: React.ReactNode;
}

/**
 * ErrorCatcher component that can be added to any page to ensure
 * error monitoring is properly initialized and errors are reported.
 * It will only generate test errors on the Test Error Page, not on every page.
 */
export function ErrorCatcher({ pageName, children }: ErrorCatcherProps) {
  useEffect(() => {
    // Only log page load events for testing, don't report to error system on every page
    console.log(`Page "${pageName}" loaded with error monitoring`);

    // Only create test errors on the test-error page, not on every page
    if (pageName === 'TestErrorPage' && window.location.pathname.includes('/test-error')) {
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
    }
    
    return () => {};
  }, [pageName]);

  // This component doesn't render anything
  return children || null;
}