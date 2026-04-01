import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// 演示用的示例模型
const DEMO_MODELS = [
  'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
  'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
];

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: number, message: string) => {
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

        sendProgress(5, '正在准备生成3D模型...');
        sendProgress(10, '使用演示模式生成示例模型...');

        // 模拟生成过程
        for (let i = 0; i < 8; i++) {
          await new Promise(resolve => setTimeout(resolve, 400));
          sendProgress(15 + i * 9, `正在生成... (${i + 1}/8)`);
        }

        // 随机选择一个演示模型
        const demoModelUrl = DEMO_MODELS[Math.floor(Math.random() * DEMO_MODELS.length)];
        
        sendProgress(90, '模型生成完成');
        sendModel(demoModelUrl, 'glb', undefined, true);
        sendProgress(100, '完成！（演示模式）');
        sendComplete();
      } catch (error) {
        sendError(error instanceof Error ? error.message : '生成失败');
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
