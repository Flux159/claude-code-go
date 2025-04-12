import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to receive and forward JavaScript errors from the client
 * to the Python server for processing by Claude.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the error data from the request
    const errorData = await request.json();
    
    // For server-to-server communication, we can use localhost since both
    // the Next.js app and the Python server are running on the same machine
    const hostname = 'localhost';
    const port = '8142';
    console.log(`Reporting error to Python server at http://${hostname}:${port}/report-error`);
    
    // Forward the error to the Python server - direct server-to-server comms
    const response = await fetch(`http://${hostname}:${port}/report-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to forward error: ${response.statusText}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error forwarding error to Python server:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
