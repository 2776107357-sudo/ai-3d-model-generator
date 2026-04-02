import { NextResponse } from 'next/server';

export async function GET() {
  // 检查 SDK 需要的环境变量
  const envCheck = {
    // SDK 相关
    COZE_API_KEY: process.env.COZE_API_KEY ? '已设置' : '未设置',
    COZE_BASE_URL: process.env.COZE_BASE_URL || '未设置（使用默认）',
    
    // 项目相关
    TRIPO_API_KEY: process.env.TRIPO_API_KEY ? '已设置' : '未设置',
    TRIPO_PROXY_URL: process.env.TRIPO_PROXY_URL || '未设置（使用默认）',
    
    // Vercel 环境
    VERCEL_ENV: process.env.VERCEL_ENV || '本地环境',
    NODE_ENV: process.env.NODE_ENV,
    
    // 诊断
    timestamp: new Date().toISOString(),
    recommendation: !process.env.COZE_API_KEY 
      ? '⚠️ 需要在 Vercel 中设置 COZE_API_KEY 环境变量'
      : '✅ 环境变量配置正常',
  };

  return NextResponse.json(envCheck, { status: 200 });
}
