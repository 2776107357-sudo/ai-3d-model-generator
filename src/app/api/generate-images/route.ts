import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 300;

// 本地图片作为后备
const FALLBACK_IMAGES = {
  main: '/images/main.jpg',
  front: '/images/front.jpg',
  side: '/images/side.jpg',
  back: '/images/back.jpg',
};

// 带心跳的图片生成
async function generateWithHeartbeat(
  client: ImageGenerationClient,
  prompt: string,
  sendEvent: (data: object) => void,
  viewName: string
): Promise<string> {
  return new Promise(async (resolve) => {
    let completed = false;
    
    // 每3秒发送心跳
    const heartbeatInterval = setInterval(() => {
      if (!completed) {
        sendEvent({ type: 'heartbeat', message: `正在生成${viewName}，请稍候...` });
      }
    }, 3000);
    
    try {
      const response = await client.generate({
        prompt,
        size: '1024x1024',
        watermark: false,
      });
      
      const helper = client.getResponseHelper(response);
      
      if (helper.success && helper.imageUrls.length > 0) {
        // 下载图片
        const imageResponse = await fetch(helper.imageUrls[0]);
        const buffer = Buffer.from(await imageResponse.arrayBuffer());
        const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        completed = true;
        clearInterval(heartbeatInterval);
        resolve(base64);
      } else {
        completed = true;
        clearInterval(heartbeatInterval);
        resolve(FALLBACK_IMAGES[viewName as keyof typeof FALLBACK_IMAGES] || FALLBACK_IMAGES.main);
      }
    } catch (error) {
      completed = true;
      clearInterval(heartbeatInterval);
      resolve(FALLBACK_IMAGES[viewName as keyof typeof FALLBACK_IMAGES] || FALLBACK_IMAGES.main);
    }
  });
}

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

        sendEvent({ type: 'progress', progress: 5, message: '正在初始化豆包AI...' });

        // 初始化客户端
        const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
        const config = new Config();
        const client = new ImageGenerationClient(config, customHeaders);

        const views = [
          { type: 'main', name: '主视图', prompt: `Product photography of ${prompt}, professional studio lighting, white background, 4k` },
          { type: 'front', name: '正视图', prompt: `Front view of ${prompt}, white background, product photography, 4k` },
          { type: 'side', name: '侧视图', prompt: `Side view of ${prompt}, white background, product photography, 4k` },
          { type: 'back', name: '后视图', prompt: `Back view of ${prompt}, white background, product photography, 4k` },
        ];

        let successCount = 0;
        let aiCount = 0;

        for (let i = 0; i < views.length; i++) {
          const view = views[i];
          const progress = 10 + (i * 22);
          
          sendEvent({ type: 'progress', progress, message: `正在生成${view.name}...` });

          // 使用带心跳的生成
          const imageUrl = await generateWithHeartbeat(client, view.prompt, sendEvent, view.type);
          
          sendEvent({ type: 'image', url: imageUrl, imageType: view.type });
          
          if (imageUrl.startsWith('data:image')) {
            aiCount++;
          }
          successCount++;

          await new Promise(resolve => setTimeout(resolve, 300));
        }

        sendEvent({ type: 'progress', progress: 100, message: `生成完成！AI生成 ${aiCount}/4 张` });
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
