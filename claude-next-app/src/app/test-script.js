// This script can be run directly in the browser console to test error reporting
function testErrorReporting() {
  console.log('Testing error reporting...');
  
  // Create a test error
  const testError = new Error('Test error from test-script.js');
  
  // Send the error to the API endpoint
  fetch('/api/error', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: testError.message,
      name: testError.name,
      stack: testError.stack,
      source: 'test-script.js',
      timestamp: new Date().toISOString(),
      test: true
    }),
  })
  .then(response => response.json())
  .then(data => {
    console.log('Test error reported successfully:', data);
  })
  .catch(err => {
    console.error('Failed to report test error:', err);
  });
}

// You can run this in the browser console by running:
// testErrorReporting()