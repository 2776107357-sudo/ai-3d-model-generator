import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Tripo AI 配置
const TRIPO_CONFIG = {
  clientId: 'tcli_d63c726072c241789029971c4fa47f0e',
  apiKey: 'tsk_4e-wfyELxLmo_ezM-qccv11sB13SYgJ7oHzNizwHz09',
  proxyUrl: 'http://tripo-proxy.2776107357.workers.dev',
};

interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
    status: string;
    result?: {
      model?: string;
      rendered_image?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: number, message: string) => {
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

      const sendError = (message: string) => {
        const data = JSON.stringify({ type: 'error', message });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
      };

      try {
        const body = await request.json();
        const { imageUrl, prompt } = body;

        if (!imageUrl) {
          sendError('缺少图片URL');
          return;
        }

        sendProgress(5, '正在连接Tripo AI服务...');

        // 步骤1: 创建图像到3D任务
        sendProgress(10, '正在创建3D生成任务...');
        
        const createTaskResponse = await fetch(`${TRIPO_CONFIG.proxyUrl}/api/v2/task`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TRIPO_CONFIG.apiKey}`,
          },
          body: JSON.stringify({
            type: 'image_to_model',
            file: {
              // Tripo AI 需要图片URL，这里使用传入的imageUrl
              url: imageUrl,
            },
            mode: 'preview', // 使用预览模式，速度更快
            // 可选参数
            model_seed: Math.floor(Math.random() * 1000000),
            model_style: 'realistic',
            quad: false,
            face_limit: 0,
            texture: true,
            pbr: true,
            // 如果有prompt，添加到任务中
            ...(prompt && { prompt }),
          }),
        });

        if (!createTaskResponse.ok) {
          const errorText = await createTaskResponse.text();
          console.error('Create task error:', errorText);
          sendError(`创建任务失败: ${createTaskResponse.status}`);
          return;
        }

        const taskData: TripoTaskResponse = await createTaskResponse.json();
        
        if (taskData.code !== 0 || !taskData.data?.task_id) {
          sendError(taskData.data?.status || '创建任务失败');
          return;
        }

        const taskId = taskData.data.task_id;
        sendProgress(20, `任务已创建，ID: ${taskId.slice(0, 8)}...`);

        // 步骤2: 轮询任务状态
        let progress = 25;
        let attempts = 0;
        const maxAttempts = 120; // 最多等待2分钟
        let modelUrl: string | null = null;
        let previewUrl: string | null = null;

        while (attempts < maxAttempts) {
          attempts++;
          
          // 查询任务状态
          const statusResponse = await fetch(
            `${TRIPO_CONFIG.proxyUrl}/api/v2/task/${taskId}`,
            {
              headers: {
                'Authorization': `Bearer ${TRIPO_CONFIG.apiKey}`,
              },
            }
          );

          if (!statusResponse.ok) {
            console.error('Status check error:', await statusResponse.text());
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          const statusData: TripoTaskResponse = await statusResponse.json();

          // 更新进度
          progress = Math.min(90, 25 + (attempts / maxAttempts) * 65);
          
          if (statusData.data?.status === 'running') {
            sendProgress(progress, '正在生成3D模型...');
          } else if (statusData.data?.status === 'success') {
            // 任务成功
            modelUrl = statusData.data.result?.model || null;
            previewUrl = statusData.data.result?.rendered_image || null;
            break;
          } else if (statusData.data?.status === 'failed') {
            sendError('3D模型生成失败');
            return;
          }

          // 等待1秒后再次查询
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!modelUrl) {
          sendError('3D模型生成超时');
          return;
        }

        sendProgress(95, '模型生成完成，正在准备下载...');
        sendModel(modelUrl, 'glb', previewUrl || undefined);
        sendProgress(100, '完成！');
        sendComplete();

      } catch (error) {
        console.error('Generate 3D error:', error);
        sendError(error instanceof Error ? error.message : '生成3D模型失败');
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
