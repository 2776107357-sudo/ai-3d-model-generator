import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// 本地图片（快速响应）
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
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const formData = await request.formData();
        const prompt = formData.get('prompt') as string;

        if (!prompt?.trim()) {
          sendEvent({ type: 'error', message: '请输入提示词' });
          controller.close();
          return;
        }

        sendEvent({ type: 'progress', progress: 5, message: '正在准备图片...' });

        const views = [
          { type: 'main', name: '主视图' },
          { type: 'front', name: '正视图' },
          { type: 'side', name: '侧视图' },
          { type: 'back', name: '后视图' },
        ];

        // 快速返回本地图片
        for (let i = 0; i < views.length; i++) {
          const view = views[i];
          const progress = 20 + (i * 20);
          
          sendEvent({ type: 'progress', progress, message: `生成${view.name}...` });
          sendEvent({ type: 'image', url: LOCAL_IMAGES[view.type as keyof typeof LOCAL_IMAGES], imageType: view.type });
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        sendEvent({ type: 'progress', progress: 100, message: '图片生成完成！' });
        sendEvent({ type: 'complete' });
        controller.close();
      } catch (error) {
        sendEvent({ type: 'error', message: error instanceof Error ? error.message : '生成失败' });
        controller.close();
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
