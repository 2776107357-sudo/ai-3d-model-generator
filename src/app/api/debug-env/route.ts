import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  // 显示环境变量状态（不显示敏感值）
  const envStatus = {
    TRIPO_PROXY_URL: {
      exists: !!process.env.TRIPO_PROXY_URL,
      value: process.env.TRIPO_PROXY_URL || '(未设置，使用默认值)',
      defaultValue: 'https://tripo-proxy.2776107357.workers.dev',
    },
    TRIPO_API_KEY: {
      exists: !!process.env.TRIPO_API_KEY,
      // 不显示完整值，只显示前缀
      valuePrefix: process.env.TRIPO_API_KEY ? process.env.TRIPO_API_KEY.substring(0, 8) + '...' : '(未设置)',
    },
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV || '(本地环境)',
  };

  return NextResponse.json({
    message: '🔍 环境变量诊断',
    timestamp: new Date().toISOString(),
    environmentVariables: envStatus,
    instructions: {
      step1: '如果 TRIPO_PROXY_URL 显示"未设置"，请检查Vercel环境变量配置',
      step2: '如果已配置但未生效，请确认已重新部署',
      step3: '确保环境变量名称拼写正确（区分大小写）',
      step4: '确保值为: https://tripo-proxy.2776107357.workers.dev',
    },
    nextSteps: [
      '访问 /api/health 检查网络连接',
      '如果 proxyAvailable 为 false，说明环境变量未生效',
      '在 Vercel 中 Redeploy 项目',
    ],
  });
}
