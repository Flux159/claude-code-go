'use client';

import React, { useState, useEffect } from 'react';

export default function DebugPage() {
  const [hostname, setHostname] = useState('localhost');
  const [port, setPort] = useState('8142');
  const [endpoint, setEndpoint] = useState('errors');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [directResult, setDirectResult] = useState<any>(null);
  
  const runTest = async () => {
    setLoading(true);
    try {
      // Test via the API route
      const response = await fetch(`/api/debug?hostname=${hostname}&port=${port}&endpoint=${endpoint}`);
      const data = await response.json();
      setResult(data);
      
      // Also try a direct test from the browser if possible
      if (typeof window !== 'undefined') {
        try {
          const directResponse = await fetch(`http://${hostname}:${port}/${endpoint}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });
          
          const directText = await directResponse.text();
          let directJson = null;
          try {
            directJson = JSON.parse(directText);
          } catch (e) {
            // Not JSON
          }
          
          setDirectResult({
            success: directResponse.ok,
            status: directResponse.status,
            statusText: directResponse.statusText,
            headers: Object.fromEntries(directResponse.headers.entries()),
            responseText: directText.substring(0, 1000),
            json: directJson
          });
        } catch (browserError) {
          setDirectResult({
            success: false,
            error: String(browserError),
            note: 'This is likely a CORS error, which is expected for browser-to-server direct calls'
          });
        }
      }
    } catch (error) {
      setResult({
        success: false,
        error: String(error)
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Test sending an error report
  const testErrorReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Debug test error',
          name: 'DebugTestError',
          stack: 'Debug test error stack trace',
          source: 'debug-page',
          timestamp: new Date().toISOString(),
          test: true
        }),
      });
      
      const data = await response.json();
      setResult({
        type: 'Error Report Test',
        success: response.ok,
        status: response.status,
        data
      });
    } catch (error) {
      setResult({
        type: 'Error Report Test',
        success: false,
        error: String(error)
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Python Server Connection Debug</h1>
      
      <div className="mb-8 p-4 bg-gray-50 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Test Server Connection</h2>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hostname
            </label>
            <input
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port
            </label>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint
            </label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={runTest}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
          
          <button
            onClick={testErrorReport}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Error Report'}
          </button>
        </div>
      </div>
      
      {result && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Test Results</h2>
          <div className="p-4 bg-gray-100 rounded overflow-auto max-h-60">
            <pre className="text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      {directResult && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Direct Browser Test Results</h2>
          <div className="p-4 bg-gray-100 rounded overflow-auto max-h-60">
            <pre className="text-sm">
              {JSON.stringify(directResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold mb-2">Debugging Tips</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>The server-to-server test uses Next.js API routes which run on the server</li>
          <li>The direct browser test will likely fail with CORS errors (expected behavior)</li>
          <li>Check both tests to confirm if it's a CORS issue or connection issue</li>
          <li>For error reporting tests, check the Python server logs</li>
        </ul>
      </div>
    </div>
  );
}