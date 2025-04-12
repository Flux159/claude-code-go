import { NextRequest, NextResponse } from 'next/server';

/**
 * Fallback error reporting endpoint that accepts error data via query parameters.
 * This is used as a last resort when the main error reporting fetch might fail.
 * Since image requests almost always succeed where fetch might fail, this provides
 * a robust fallback mechanism.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the data from the URL
    const url = new URL(request.url);
    const data = url.searchParams.get('data');
    
    if (!data) {
      return new NextResponse('Missing data parameter', { status: 400 });
    }
    
    // Decode the data
    const errorData = JSON.parse(decodeURIComponent(data));
    
    // Add a source tag to identify it came through this fallback
    errorData.source = `${errorData.source || 'unknown'}-via-ping`;
    
    // Forward to the regular error endpoint
    const hostname = 'localhost';
    const port = '8142';
    console.log(`Ping endpoint forwarding error to Python server at http://${hostname}:${port}/report-error`);
    
    try {
      const response = await fetch(`http://${hostname}:${port}/report-error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });
      
      if (!response.ok) {
        console.error(`Failed to forward ping error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error forwarding ping error to Python server:', error);
    }
    
    // Return a tiny transparent GIF image (1x1 pixel)
    const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    return new NextResponse(transparentGif, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error in error-ping endpoint:', error);
    // Still return a valid image, even on error
    const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    return new NextResponse(transparentGif, {
      headers: {
        'Content-Type': 'image/gif',
      },
    });
  }
}