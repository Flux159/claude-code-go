import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to test network connectivity
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const hostname = searchParams.get('hostname') || 'localhost';
    const port = searchParams.get('port') || '8142';
    const endpoint = searchParams.get('endpoint') || 'errors';
    
    console.log(`Debugging connection to http://${hostname}:${port}/${endpoint}`);
    
    // Try to connect to the specified server
    const response = await fetch(`http://${hostname}:${port}/${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    // Get response as text
    const responseText = await response.text();
    
    // Try to parse as JSON
    let jsonData = null;
    try {
      jsonData = JSON.parse(responseText);
    } catch (e) {
      // Not JSON
    }
    
    // Return debug info
    return NextResponse.json({ 
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      responseText: responseText.substring(0, 1000), // Limit long responses
      json: jsonData,
      serverInfo: {
        hostname,
        port,
        endpoint,
        url: `http://${hostname}:${port}/${endpoint}`
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error),
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}