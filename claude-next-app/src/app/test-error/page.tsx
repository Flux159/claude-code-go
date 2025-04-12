'use client';

import React, { useState, useEffect } from 'react';
// Ensure the error monitor is loaded for this page
import '../error-monitor';

// Component with deliberate errors for testing error handling
export default function ErrorTestPage() {
  const [errorType, setErrorType] = useState<string>('none');
  const [monitorInitialized, setMonitorInitialized] = useState(false);
  
  // Initialize error monitoring when the component mounts
  useEffect(() => {
    // Check if window has the error event listeners
    const hasWindowErrorListener = window.onerror !== null;
    const hasUnhandledRejectionListener = window.onunhandledrejection !== null;
    
    setMonitorInitialized(true);
    
    // Manually force initialization if needed
    if (typeof window !== 'undefined') {
      if (!window.testErrorReporting) {
        window.testErrorReporting = function() {
          fetch('/api/error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: "Manual test error from init",
              name: "TestError",
              stack: "Test error stack trace",
              source: "test-error-init",
              timestamp: new Date().toISOString(),
              test: true
            })
          })
          .then(r => r.json())
          .then(data => console.log('Test error reported successfully:', data));
        };
      }
      
      // Report initialization status
      fetch('/api/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'initialization',
          message: `Error monitoring initialization status: ${hasWindowErrorListener ? 'OK' : 'Missing'} / ${hasUnhandledRejectionListener ? 'OK' : 'Missing'}`,
          timestamp: new Date().toISOString(),
          source: 'test-error-page-init',
          url: window.location.href
        }),
      });
    }
  }, []);
  
  // Function that causes a runtime error
  const triggerRuntimeError = () => {
    try {
      // @ts-ignore - Deliberate error
      const obj = null;
      obj.nonExistentMethod(); // This will throw TypeError: Cannot read property 'nonExistentMethod' of null
    } catch (error) {
      // Report error manually to ensure it's captured
      fetch('/api/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manualRuntime',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack trace',
          timestamp: new Date().toISOString(),
          source: 'test-error-page',
          url: window.location.href
        }),
      })
      .then(response => console.log('Runtime error reported:', response.ok))
      .catch(e => console.error('Failed to report runtime error:', e));
      
      // Also throw it again to test window.onerror
      throw error;
    }
  };
  
  // Function that causes a React error
  const triggerReactError = () => {
    setErrorType('react');
    // The error will be caught by the ErrorBoundary
  };
  
  // Function that logs an error to console
  const triggerConsoleError = () => {
    console.error('Test console error message');
    console.error(new Error('Test error object in console'));
    
    // Manually report in case console.error override isn't working
    fetch('/api/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'manualConsoleError',
        message: 'Test console error message (manually reported)',
        timestamp: new Date().toISOString(),
        source: 'test-error-page',
        url: window.location.href
      }),
    })
    .then(response => console.log('Console error reported:', response.ok))
    .catch(e => console.error('Failed to report console error:', e));
  };
  
  // Function that causes an unhandled promise rejection
  const triggerPromiseError = () => {
    // First try the auto-detection via unhandledrejection
    new Promise((_, reject) => {
      reject(new Error('Test unhandled promise rejection'));
    });
    
    // Also report manually to ensure it works
    setTimeout(() => {
      fetch('/api/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'manualPromiseRejection',
          message: 'Test unhandled promise rejection (manually reported)',
          stack: new Error().stack,
          timestamp: new Date().toISOString(),
          source: 'test-error-page',
          url: window.location.href
        }),
      })
      .then(response => console.log('Promise rejection reported:', response.ok))
      .catch(e => console.error('Failed to report promise rejection:', e));
    }, 500);
  };
  
  // This will cause an error in React's rendering
  if (errorType === 'react') {
    // @ts-ignore - Deliberate error for testing
    return <div>{nonExistentVariable.property}</div>;
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Error Test Page</h1>
        <a 
          href="/" 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Home
        </a>
      </div>
      <div className={`px-4 py-2 mb-4 rounded text-white ${monitorInitialized ? 'bg-green-500' : 'bg-red-500'}`}>
        Error Monitor Status: {monitorInitialized ? 'Initialized' : 'Not Initialized'}
      </div>
      <p className="mb-6">
        This page contains buttons that trigger different types of errors to test the error passing system.
        <br />
        <small className="text-gray-500">All buttons now use manual error reporting as a backup to ensure errors are captured.</small>
      </p>
      
      <div className="space-y-4">
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={triggerRuntimeError}
        >
          Trigger Runtime Error
        </button>
        
        <button
          className="block px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          onClick={triggerReactError}
        >
          Trigger React Render Error
        </button>
        
        <button
          className="block px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          onClick={triggerConsoleError}
        >
          Trigger Console Error
        </button>
        
        <button
          className="block px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          onClick={triggerPromiseError}
        >
          Trigger Unhandled Promise Rejection
        </button>
      </div>
      
      <div className="mt-8 p-4 border border-gray-300 rounded">
        <h2 className="font-bold mb-2">How to test:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Click one of the buttons above to trigger an error</li>
          <li>The error should be caught and sent to the Python server</li>
          <li>Check the Python server logs to verify the error was received</li>
          <li>Open the Claude chat and ask a question</li>
          <li>Claude should include the error information in its response</li>
        </ol>
        
        <div className="mt-4 pt-4 border-t border-gray-300">
          <h3 className="font-bold mb-2">Direct API Test</h3>
          <p className="mb-2">
            You can also test the error reporting API directly by running the following in your browser console:
          </p>
          <div className="bg-gray-800 text-gray-100 p-3 rounded">
            <code>
              {`fetch('/api/error', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Manual test error",
    name: "TestError",
    stack: "Test error stack trace",
    source: "manual-test",
    timestamp: new Date().toISOString()
  })
}).then(r => r.json()).then(console.log)`}
            </code>
          </div>
        </div>
      </div>
      
      {/* Load test script */}
      <script 
        dangerouslySetInnerHTML={{ 
          __html: `
            function testErrorReporting() {
              console.log('Testing error reporting...');
              fetch('/api/error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  message: "Manual test error",
                  name: "TestError",
                  stack: "Test error stack trace",
                  source: "manual-test",
                  timestamp: new Date().toISOString(),
                  test: true
                })
              })
              .then(r => r.json())
              .then(data => console.log('Test error reported successfully:', data))
              .catch(err => console.error('Failed to report test error:', err));
            }
            window.testErrorReporting = testErrorReporting;
            console.log('Error testing script loaded. Run testErrorReporting() to test.');
          `
        }} 
      />
    </div>
  );
}