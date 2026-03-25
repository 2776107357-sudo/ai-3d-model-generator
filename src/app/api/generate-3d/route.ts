import { NextRequest } from 'next/server';
import axios from 'axios';

export const runtime = 'nodejs';

// Tripo AI 配置
const TRIPO_CONFIG = {
  clientId: 'tcli_d63c726072c241789029971c4fa47f0e',
  apiKey: 'tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09',
  // 用户提供的 Cloudflare Worker 代理地址
  proxyUrl: 'https://tripo-proxy.2776107357.workers.dev',
  // 备选代理地址（如果用户部署了自己的Worker）
  backupProxyUrl: process.env.TRIPO_PROXY_URL || 'https://tripo-proxy.2776107357.workers.dev',
};

// 演示用的示例模型
const DEMO_MODELS = [
  'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
  'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
];

// 检查代理服务是否可用
async function checkProxyHealth(proxyUrl: string): Promise<boolean> {
  try {
    const response = await axios.get(`${proxyUrl}/health`, { 
      timeout: 5000,
      validateStatus: () => true, // 接受任何状态码
    });
    return response.status === 200;
  } catch (error) {
    console.error(`[Health Check] Proxy ${proxyUrl} failed:`, error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: number, message: string) => {
        console.log(`[3D Gen] Progress: ${progress}% - ${message}`);
        const data = JSON.stringify({ type: 'progress', progress, message });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendModel = (url: string, format: string, previewUrl?: string, isDemo?: boolean) => {
        const data = JSON.stringify({ type: 'model', url, format, previewUrl, isDemo });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendComplete = () => {
        const data = JSON.stringify({ type: 'complete' });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
      };

      const sendError = (message: string) => {
        console.error(`[3D Gen] Error: ${message}`);
        const data = JSON.stringify({ type: 'error', message });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
      };

      // 使用演示模式
      const useDemoMode = async (reason: string) => {
        sendProgress(15, reason);
        sendProgress(20, '正在切换到演示模式...');
        
        // 模拟生成过程
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          sendProgress(20 + i * 7, `正在生成演示模型... (${i + 1}/10)`);
        }

        const demoModelUrl = DEMO_MODELS[Math.floor(Math.random() * DEMO_MODELS.length)];
        
        sendProgress(95, '演示模型生成完成');
        sendModel(demoModelUrl, 'glb', undefined, true);
        sendProgress(100, '完成！（演示模式）');
        sendComplete();
      };

      try {
        const body = await request.json();
        const { imageUrl, prompt } = body;

        console.log('[3D Gen] Request received');

        if (!imageUrl) {
          sendError('缺少图片URL');
          return;
        }

        sendProgress(5, '正在检查服务连接...');

        // 尝试主代理
        let activeProxy = TRIPO_CONFIG.proxyUrl;
        let proxyAvailable = await checkProxyHealth(activeProxy);
        
        // 如果主代理不可用，尝试备选代理
        if (!proxyAvailable && TRIPO_CONFIG.backupProxyUrl !== TRIPO_CONFIG.proxyUrl) {
          sendProgress(8, '主代理不可用，尝试备选代理...');
          activeProxy = TRIPO_CONFIG.backupProxyUrl;
          proxyAvailable = await checkProxyHealth(activeProxy);
        }

        if (!proxyAvailable) {
          console.log('[3D Gen] All proxies unavailable, using demo mode');
          await useDemoMode('代理服务暂时不可用');
          return;
        }

        sendProgress(10, `已连接到代理服务: ${activeProxy.replace('https://', '')}`);

        // 创建Tripo任务
        try {
          sendProgress(15, '正在创建3D生成任务...');
          
          const createResponse = await axios.post(
            `${activeProxy}/api/v2/task`,
            {
              type: 'image_to_model',
              file: { url: imageUrl },
              mode: 'preview',
              model_seed: Math.floor(Math.random() * 1000000),
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TRIPO_CONFIG.apiKey}`,
              },
              timeout: 30000,
            }
          );

          const taskId = createResponse.data?.data?.task_id || createResponse.data?.task_id;
          
          if (!taskId) {
            throw new Error('创建任务失败: 未返回任务ID');
          }

          sendProgress(25, `任务已创建: ${taskId.substring(0, 8)}...`);

          // 轮询任务状态
          let attempts = 0;
          const maxAttempts = 180;
          let lastStatus = '';

          while (attempts < maxAttempts) {
            attempts++;
            
            try {
              const statusResponse = await axios.get(
                `${activeProxy}/api/v2/task/${taskId}`,
                {
                  headers: {
                    'Authorization': `Bearer ${TRIPO_CONFIG.apiKey}`,
                  },
                  timeout: 10000,
                }
              );

              const status = statusResponse.data?.data?.status || statusResponse.data?.status || '';
              
              // 只在状态变化时更新
              if (status !== lastStatus) {
                lastStatus = status;
                console.log(`[3D Gen] Status: ${status}`);
              }

              const progressPercent = 25 + Math.min(65, attempts * 0.35);
              
              if (status === 'success' || status === 'completed') {
                const modelUrl = statusResponse.data?.data?.result?.model || 
                                statusResponse.data?.result?.model;
                
                if (modelUrl) {
                  sendProgress(95, '模型生成完成');
                  sendModel(modelUrl, 'glb', undefined, false);
                  sendProgress(100, '完成！');
                  sendComplete();
                  return;
                } else {
                  throw new Error('模型URL为空');
                }
              } else if (status === 'failed' || status === 'error') {
                const errorMsg = statusResponse.data?.data?.message || 
                                statusResponse.data?.message || 
                                '生成失败';
                throw new Error(`Tripo AI: ${errorMsg}`);
              } else if (status === 'queued') {
                sendProgress(progressPercent, '任务排队中...');
              } else if (status === 'running') {
                sendProgress(progressPercent, '正在生成3D模型...');
              } else {
                sendProgress(progressPercent, `处理中... (${status})`);
              }

            } catch (pollError) {
              console.error(`[3D Gen] Poll error at attempt ${attempts}:`, pollError);
              // 继续尝试，不立即失败
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          throw new Error('生成超时，请重试');

        } catch (apiError: any) {
          console.error('[3D Gen] API error:', apiError);
          
          // 如果是网络错误，使用演示模式
          if (apiError.code === 'ECONNREFUSED' || 
              apiError.code === 'ETIMEDOUT' ||
              apiError.code === 'ENOTFOUND') {
            await useDemoMode('网络连接失败');
          } else {
            throw apiError;
          }
        }

      } catch (error) {
        console.error('[3D Gen] Fatal error:', error);
        sendError(error instanceof Error ? error.message : '生成3D模型时发生未知错误');
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
