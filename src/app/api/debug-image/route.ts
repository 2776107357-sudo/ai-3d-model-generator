import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET() {
  console.log('[Debug] Starting image generation test...');
  
  try {
    const apiKey = process.env.COZE_API_KEY;
    console.log('[Debug] COZE_API_KEY exists:', !!apiKey);
    console.log('[Debug] COZE_API_KEY prefix:', apiKey?.substring(0, 8) || 'N/A');
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'COZE_API_KEY not found in environment variables' 
      });
    }

    console.log('[Debug] Calling Coze API directly...');
    const startTime = Date.now();
    
    const response = await fetch('https://api.coze.cn/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-seedream-3-0-t2i-250415',
        prompt: 'a simple red apple on white background',
        size: '1024x1024',
        n: 1,
      }),
    });
    
    const duration = Date.now() - startTime;
    console.log('[Debug] API call completed in', duration, 'ms');
    console.log('[Debug] Response status:', response.status);
    
    const responseText = await response.text();
    console.log('[Debug] Response body:', responseText.substring(0, 500));
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        duration: `${duration}ms`,
        status: response.status,
        error: responseText
      });
    }
    
    const data = JSON.parse(responseText);
    
    if (data.data && data.data[0]?.url) {
      return NextResponse.json({
        success: true,
        duration: `${duration}ms`,
        imageUrl: data.data[0].url,
        message: 'Image generation test passed!'
      });
    } else {
      return NextResponse.json({
        success: false,
        duration: `${duration}ms`,
        response: data
      });
    }
    
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
