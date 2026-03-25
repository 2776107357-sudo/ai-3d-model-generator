import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const runtime = 'nodejs';

// Tripo 配置
const TRIPO_CONFIG = {
  proxyUrl: process.env.TRIPO_PROXY_URL || 'https://tripo-proxy.2776107357.workers.dev',
  hasApiKey: !!process.env.TRIPO_API_KEY || true,
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

  // 测试1: 代理健康检查
  try {
    const healthResponse = await axios.get(`${TRIPO_CONFIG.proxyUrl}/health`, {
      timeout: 5000,
    });
    results.tests.proxyHealth = {
      success: true,
      status: healthResponse.status,
      data: healthResponse.data,
    };
  } catch (error: any) {
    results.tests.proxyHealth = {
      success: false,
      error: error.message,
      code: error.code,
    };
  }

  // 测试2: Tripo API连接（如果健康检查通过）
  if (results.tests.proxyHealth?.success) {
    try {
      const apiTestResponse = await axios.get(
        `${TRIPO_CONFIG.proxyUrl}/api/v2/task/test`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.TRIPO_API_KEY || 'tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09'}`,
          },
          timeout: 5000,
        }
      );
      results.tests.tripoAPI = {
        success: true,
        status: apiTestResponse.status,
      };
    } catch (error: any) {
      results.tests.tripoAPI = {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      };
    }
  }

  // 总结
  results.summary = {
    allPassed: results.tests.proxyHealth?.success && results.tests.tripoAPI?.success,
    proxyAvailable: results.tests.proxyHealth?.success || false,
    apiReady: results.tests.tripoAPI?.success || false,
    recommendation: results.tests.proxyHealth?.success 
      ? (results.tests.tripoAPI?.success 
          ? '系统正常，可以生成3D模型' 
          : '代理可用但API认证可能有问题')
      : '代理不可用，将使用演示模式',
  };

  return NextResponse.json(results);
}
