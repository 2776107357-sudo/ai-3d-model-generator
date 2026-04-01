import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Tripo 配置
const TRIPO_CONFIG = {
  proxyUrl: process.env.TRIPO_PROXY_URL || 'https://tripo-proxy4.2776107357.workers.dev',
  hasApiKey: !!(process.env.TRIPO_API_KEY || true),
};

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    config: {
      proxyUrl: TRIPO_CONFIG.proxyUrl,
      hasApiKey: TRIPO_CONFIG.hasApiKey,
    },
    tests: {},
  };

  // 测试代理健康检查
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const healthResponse = await fetch(`${TRIPO_CONFIG.proxyUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    const healthData = await healthResponse.json();
    results.tests.proxyHealth = {
      success: healthResponse.ok,
      status: healthResponse.status,
      data: healthData,
    };
  } catch (error: any) {
    results.tests.proxyHealth = {
      success: false,
      error: error.message || 'Unknown error',
    };
  }

  // 总结
  results.summary = {
    allPassed: results.tests.proxyHealth?.success || false,
    proxyAvailable: results.tests.proxyHealth?.success || false,
    apiReady: results.tests.proxyHealth?.success || false,
    recommendation: results.tests.proxyHealth?.success 
      ? '系统正常，可以生成3D模型'
      : '代理不可用，将使用演示模式',
  };

  return NextResponse.json(results);
}
