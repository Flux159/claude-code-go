'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary component that catches JavaScript errors in its child component tree
 * and reports them to the Python server via the error API endpoint.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Report the error to our API endpoint
    this.reportError(error, errorInfo);
  }

  async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      console.log('ErrorBoundary: Reporting error to API endpoint');
      console.log('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.slice(0, 200) + '...' // Truncating for logging
      });
      
      // Try to report with fetch - this is the primary method
      const reportWithFetch = async () => {
        try {
          const response = await fetch('/api/error', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: error.message,
              name: error.name,
              stack: error.stack,
              componentStack: errorInfo.componentStack,
              timestamp: new Date().toISOString(),
              source: 'ErrorBoundary',
              url: window.location.href
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Error successfully reported to server:', data);
            return true;
          } else {
            console.error('Failed to report error to server:', await response.text());
            return false;
          }
        } catch (e) {
          console.error('Exception while reporting error with fetch:', e);
          return false;
        }
      };
      
      // Try primary method
      const fetchSucceeded = await reportWithFetch();
      
      // If fetch fails, try with a simple image ping as fallback
      // This is a simple but effective way to send data even when 
      // the main network stack might be compromised
      if (!fetchSucceeded) {
        try {
          const errorData = encodeURIComponent(JSON.stringify({
            message: error.message.slice(0, 100), // Limit length for URL
            name: error.name,
            source: 'ErrorBoundary-Fallback',
            timestamp: new Date().toISOString()
          }));
          
          const img = new Image();
          img.src = `/api/error-ping?data=${errorData}&t=${Date.now()}`;
          console.log('Attempted fallback error reporting via image ping');
        } catch (e) {
          console.error('Exception in fallback error reporting:', e);
        }
      }
    } catch (e) {
      console.error('Exception in main error reporting function:', e);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <summary>Show error details</summary>
            <p>{this.state.error?.message}</p>
            <p>{this.state.error?.stack}</p>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
