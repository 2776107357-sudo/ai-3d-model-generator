import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET() {
  console.log('[Debug] Starting image generation test...');
  
  const apiKey = process.env.COZE_API_KEY;
  console.log('[Debug] COZE_API_KEY exists:', !!apiKey);
  
  if (!apiKey) {
    return NextResponse.json({ 
      success: false, 
      error: 'COZE_API_KEY not found' 
    });
  }

  const endpoints = [
    { url: 'https://api.coze.cn/v1/images/generations', name: 'V1 Images' },
    { url: 'https://api.coze.cn/open_api/v1/images/generations', name: 'Open API V1' },
    { url: 'https://api.coze.cn/v3/images/generations', name: 'V3 Images' },
  ];

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`[Debug] Testing ${endpoint.name}: ${endpoint.url}`);
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: 'a red apple',
          size: '1024x1024',
          n: 1,
        }),
      });
      
      const duration = Date.now() - startTime;
      const text = await response.text();
      
      results.push({
        endpoint: endpoint.name,
        url: endpoint.url,
        status: response.status,
        duration: `${duration}ms`,
        success: response.ok,
        response: text.substring(0, 300),
      });
    } catch (error) {
      results.push({
        endpoint: endpoint.name,
        url: endpoint.url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    success: results.some(r => r.success),
    results,
    note: 'Testing multiple Coze API endpoints to find the correct one',
  });
}
