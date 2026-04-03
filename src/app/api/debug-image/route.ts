import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

const API_KEY = '46f3236a-27f4-435f-8df8-6558e9c40f02';

// 测试多个可能的 API 端点
const endpoints = [
  { url: 'https://api.mihoyo.com/v1/images/generations', name: 'Mihoyo V1' },
  { url: 'https://api.mihoyo.ai/v1/images/generations', name: 'Mihoyo AI V1' },
  { url: 'https://mihoyo.ai/api/v1/images/generations', name: 'Mihoyo AI API' },
  { url: 'https://api.jimeng.ai/v1/images/generations', name: 'Jimeng V1' },
  { url: 'https://jimeng.ai/api/v1/images/generations', name: 'Jimeng API' },
  { url: 'https://api.jimeng.mihoyo.com/v1/images/generations', name: 'Jimeng Mihoyo' },
];

export async function GET() {
  console.log('[Debug] Testing MiHoYo/Jimeng API endpoints...');
  
  const results = [];

  for (const endpoint of endpoints) {
    console.log(`[Debug] Testing ${endpoint.name}: ${endpoint.url}`);
    const startTime = Date.now();
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
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
        response: text.substring(0, 500),
      });
    } catch (error) {
      results.push({
        endpoint: endpoint.name,
        url: endpoint.url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // 同时尝试不同的认证方式
  const authTests = [
    { header: 'Authorization', value: `Bearer ${API_KEY}` },
    { header: 'X-API-Key', value: API_KEY },
    { header: 'api-key', value: API_KEY },
  ];

  return NextResponse.json({
    results,
    note: 'Testing multiple API endpoints to find the correct one',
    apiKeyPrefix: API_KEY.substring(0, 8) + '...',
  });
}
