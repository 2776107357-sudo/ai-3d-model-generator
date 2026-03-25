import { NextRequest } from 'next/server';
import axios from 'axios';

export const runtime = 'nodejs';

// Tripo AI 配置
const TRIPO_CONFIG = {
  clientId: 'tcli_d63c726072c241789029971c4fa47f0e',
  apiKey: 'tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09',
  proxyUrl: 'https://tripo-proxy.2776107357.workers.dev',
};

// 演示用的示例模型（GLB格式的公开3D模型）
const DEMO_MODELS = [
  'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
  'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
];

// 检查网络是否可用
async function checkNetwork(): Promise<boolean> {
  try {
    const response = await axios.get('https://www.google.com', { timeout: 3000 });
    return response.status === 200;
  } catch {
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

      const sendModel = (url: string, format: string, previewUrl?: string) => {
        const data = JSON.stringify({ type: 'model', url, format, previewUrl });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendComplete = () => {
        const data = JSON.stringify({ type: 'complete' });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
      };

      const sendError = (message: string, useDemo?: boolean) => {
        console.error(`[3D Gen] Error: ${message}`);
        const data = JSON.stringify({ type: 'error', message, useDemo });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
      };

      try {
        const body = await request.json();
        const { imageUrl, prompt } = body;

        console.log('[3D Gen] Request received');

        if (!imageUrl) {
          sendError('缺少图片URL');
          return;
        }

        sendProgress(5, '正在检查网络连接...');

        // 检查网络是否可用
        const networkAvailable = await checkNetwork();
        console.log('[3D Gen] Network available:', networkAvailable);

        if (!networkAvailable) {
          // 网络不可用，使用演示模式
          sendProgress(15, '当前环境无法连接Tripo AI服务');
          sendProgress(20, '正在切换到演示模式...');
          
          // 模拟生成过程
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            sendProgress(20 + i * 7, `正在生成演示模型... (${i + 1}/10)`);
          }

          // 随机选择一个演示模型
          const demoModelUrl = DEMO_MODELS[Math.floor(Math.random() * DEMO_MODELS.length)];
          
          sendProgress(95, '演示模型生成完成');
          sendModel(demoModelUrl, 'glb');
          sendProgress(100, '完成！（演示模式）');
          sendComplete();
          return;
        }

        // 网络可用，尝试调用真实API
        sendProgress(10, '正在连接Tripo AI服务...');

        try {
          // 创建任务
          const createResponse = await axios.post(
            `${TRIPO_CONFIG.proxyUrl}/api/v2/task`,
            {
              type: 'image_to_model',
              file: { url: imageUrl },
              mode: 'preview',
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
            throw new Error('未返回任务ID');
          }

          sendProgress(20, `任务已创建: ${taskId.substring(0, 8)}...`);

          // 轮询任务状态
          let attempts = 0;
          const maxAttempts = 180;

          while (attempts < maxAttempts) {
            attempts++;
            sendProgress(20 + Math.min(70, attempts * 0.4), `正在生成3D模型... (${attempts}/${maxAttempts})`);

            const statusResponse = await axios.get(
              `${TRIPO_CONFIG.proxyUrl}/api/v2/task/${taskId}`,
              {
                headers: {
                  'Authorization': `Bearer ${TRIPO_CONFIG.apiKey}`,
                },
                timeout: 10000,
              }
            );

            const status = statusResponse.data?.data?.status || statusResponse.data?.status;

            if (status === 'success' || status === 'completed') {
              const modelUrl = statusResponse.data?.data?.result?.model || 
                              statusResponse.data?.result?.model;
              
              if (modelUrl) {
                sendProgress(95, '模型生成完成');
                sendModel(modelUrl, 'glb');
                sendProgress(100, '完成！');
                sendComplete();
                return;
              }
            } else if (status === 'failed' || status === 'error') {
              throw new Error('Tripo AI生成失败');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          throw new Error('生成超时');

        } catch (apiError) {
          console.error('[3D Gen] API error:', apiError);
          
          // API失败，回退到演示模式
          sendProgress(20, 'API调用失败，切换到演示模式...');
          
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            sendProgress(20 + i * 7, `正在生成演示模型... (${i + 1}/10)`);
          }

          const demoModelUrl = DEMO_MODELS[Math.floor(Math.random() * DEMO_MODELS.length)];
          
          sendProgress(95, '演示模型生成完成');
          sendModel(demoModelUrl, 'glb');
          sendProgress(100, '完成！（演示模式）');
          sendComplete();
        }

      } catch (error) {
        sendError(error instanceof Error ? error.message : '未知错误');
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
