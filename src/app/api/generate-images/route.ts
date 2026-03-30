import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// 本地图片路径（存储在 public 目录）
const LOCAL_IMAGES = {
  main: '/images/main.jpg',
  front: '/images/front.jpg',
  side: '/images/side.jpg',
  back: '/images/back.jpg',
};

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: number, message: string) => {
        const data = JSON.stringify({ type: 'progress', progress, message });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendImage = (url: string, imageType: string) => {
        const data = JSON.stringify({ type: 'image', url, imageType });
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
        const formData = await request.formData();
        const prompt = formData.get('prompt') as string;

        if (!prompt?.trim()) {
          sendError('请输入提示词');
          return;
        }

        sendProgress(5, '正在准备生成图片...');

        const viewTypes = ['main', 'front', 'side', 'back'] as const;
        const viewNames: Record<string, string> = {
          main: '主视图',
          front: '正视图',
          side: '侧视图',
          back: '后视图',
        };

        // 使用本地图片
        for (let i = 0; i < viewTypes.length; i++) {
          const viewType = viewTypes[i];
          const progress = 20 + (i * 20);
          
          sendProgress(progress, `正在生成${viewNames[viewType]}...`);
          
          // 使用本地图片路径
          sendImage(LOCAL_IMAGES[viewType], viewType);
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        sendProgress(100, '图片生成完成！');
        sendComplete();
      } catch (error) {
        console.error('Generate images error:', error);
        sendError(error instanceof Error ? error.message : '生成图片失败');
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
