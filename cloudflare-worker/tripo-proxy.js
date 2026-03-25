// Cloudflare Worker - Tripo AI 代理
// 部署到 Cloudflare Workers

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS 预检请求处理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    
    // 健康检查
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'tripo-proxy',
        timestamp: new Date().toISOString()
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Tripo AI API 转发
    if (url.pathname.startsWith('/api/')) {
      return await proxyTripoAPI(request);
    }

    // 默认响应
    return new Response(JSON.stringify({
      service: 'Tripo AI Proxy',
      endpoints: {
        '/health': 'Health check',
        '/api/v2/task': 'Create task (POST)',
        '/api/v2/task/:id': 'Get task status (GET)',
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};

// 代理Tripo AI API请求
async function proxyTripoAPI(request: Request): Promise<Response> {
  const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2';
  
  try {
    const url = new URL(request.url);
    const tripoUrl = TRIPO_API_BASE + url.pathname.replace('/api/v2', '') + url.search;
    
    console.log(`[Proxy] ${request.method} ${tripoUrl}`);
    
    // 复制请求头
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // 转发授权头和其他必要的头
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });
    
    // 构建转发请求
    const proxyRequest: RequestInit = {
      method: request.method,
      headers: headers,
    };
    
    // 如果有请求体，转发请求体
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      proxyRequest.body = await request.text();
    }
    
    // 发送请求到Tripo AI
    const response = await fetch(tripoUrl, proxyRequest);
    
    // 复制响应
    const responseBody = await response.text();
    
    // 返回响应，添加CORS头
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
    
  } catch (error) {
    console.error('[Proxy Error]', error);
    
    return new Response(JSON.stringify({
      code: -1,
      message: 'Proxy error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      data: null,
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// 环境变量类型定义
interface Env {
  // 如果需要，可以在这里添加环境变量
}
