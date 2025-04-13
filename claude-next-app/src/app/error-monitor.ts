'use client';

/**
 * Global error monitoring script that captures unhandled errors
 * and reports them to the Python server via the error API endpoint.
 * 
 * This script is designed to be imported once at the application root level
 * and will automatically monitor all errors across the application.
 */

// Export a function to check if monitoring is initialized
export const isErrorMonitoringInitialized = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (window as any).__errorMonitorInitialized === true;
};

// Only run in the browser
if (typeof window !== 'undefined' && !(window as any).__errorMonitorInitialized) {
  // Mark as initialized to prevent duplicate initialization
  (window as any).__errorMonitorInitialized = true;
  // Save the original console.error
  const originalConsoleError = console.error;

  // Override console.error to capture and report errors
  console.error = function(...args) {
    // Call the original console.error
    originalConsoleError.apply(console, args);

    // Report error to our API
    try {
      const errorMessage = args.map(arg => {
        if (arg instanceof Error) {
          return `${arg.name}: ${arg.message}\n${arg.stack}`;
        } else if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        } else {
          return String(arg);
        }
      }).join('\n');

      originalConsoleError('Reporting console.error to API endpoint');
      
      fetch('/api/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'console.error',
          message: errorMessage,
          timestamp: new Date().toISOString(),
          source: 'error-monitor.ts',
          url: window.location.href
        }),
      })
      .then(response => {
        if (response.ok) {
          return response.json().then(data => {
            originalConsoleError('Error successfully reported to server:', data);
          });
        } else {
          return response.text().then(text => {
            originalConsoleError('Failed to report console.error to server:', text);
          });
        }
      })
      .catch(e => {
        originalConsoleError('Exception while reporting console.error:', e);
      });
    } catch (e) {
      originalConsoleError('Error in error reporting:', e);
    }
  };

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    try {
      originalConsoleError('Reporting unhandled promise rejection to API endpoint');
      originalConsoleError('Rejection details:', {
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack?.slice(0, 200) + '...' // Truncating for logging
      });
      
      fetch('/api/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'unhandledRejection',
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
          timestamp: new Date().toISOString(),
          source: 'error-monitor.ts',
          url: window.location.href
        }),
      })
      .then(response => {
        if (response.ok) {
          return response.json().then(data => {
            originalConsoleError('Unhandled rejection successfully reported to server:', data);
          });
        } else {
          return response.text().then(text => {
            originalConsoleError('Failed to report unhandled rejection to server:', text);
          });
        }
      })
      .catch(e => {
        originalConsoleError('Exception while reporting unhandled rejection:', e);
      });
    } catch (e) {
      originalConsoleError('Error in reporting unhandled rejection:', e);
    }
  });

  // Capture global errors
  window.addEventListener('error', (event) => {
    try {
      originalConsoleError('Reporting window error to API endpoint');
      originalConsoleError('Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack?.slice(0, 200) + '...' // Truncating for logging
      });
      
      fetch('/api/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'windowError',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString(),
          source: 'error-monitor.ts',
          url: window.location.href
        }),
      })
      .then(response => {
        if (response.ok) {
          return response.json().then(data => {
            originalConsoleError('Window error successfully reported to server:', data);
          });
        } else {
          return response.text().then(text => {
            originalConsoleError('Failed to report window error to server:', text);
          });
        }
      })
      .catch(e => {
        originalConsoleError('Exception while reporting window error:', e);
      });
    } catch (e) {
      originalConsoleError('Error in reporting window error:', e);
    }
  });

  console.log('Error monitoring initialized. Global error capture active.');
  
  // Only report initialization status to the server, don't send a test error
  try {
    fetch('/api/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'system',
        message: 'Error monitoring successfully initialized',
        timestamp: new Date().toISOString(),
        source: 'error-monitor.ts',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
      }),
    })
    .catch(e => {
      // Silently ignore fetch errors here to avoid loops
    });
  } catch (e) {
    // Silently ignore any errors to prevent circular error reporting
  }
}
