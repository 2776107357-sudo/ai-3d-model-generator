import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // 直接返回网络不可用状态
  // 因为 Cloudflare Workers 代理已失效，沙箱无法直接访问 Tripo API
  const results = {
    timestamp: new Date().toISOString(),
    config: {
      proxyUrl: 'https://tripo-proxy.2776107357.workers.dev',
      hasApiKey: true,
    },
    tests: {
      proxyHealth: {
        success: false,
        error: 'Cloudflare Workers proxy is no longer available',
      },
    },
    summary: {
      allPassed: false,
      proxyAvailable: false,
      apiReady: false,
      recommendation: '当前使用演示模式，展示示例3D模型。如需真实生成，请重新部署 Cloudflare Workers 代理。',
    },
  };

  return NextResponse.json(results);
}
