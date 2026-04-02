import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 120;

// 本地备用图片（当 AI 生成失败时使用）
const FALLBACK_IMAGES = {
  main: '/images/main.jpg',
  front: '/images/front.jpg',
  side: '/images/side.jpg',
  back: '/images/back.jpg',
};

// 视角描述
const VIEW_PROMPTS = {
  main: 'main product view, front-facing, professional product photography, clean background, well-lit, high detail',
  front: 'front view, straight-on perspective, product photography, centered composition, studio lighting',
  side: 'side view, profile perspective, product photography, clean minimal background, detailed texture',
  back: 'back view, rear perspective, product photography, showing back details, professional lighting',
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
        const referenceImage = formData.get('referenceImage') as string | null;

        if (!prompt?.trim()) {
          sendEvent({ type: 'error', message: '请输入提示词' });
          controller.close();
          return;
        }

        sendEvent({ type: 'progress', progress: 5, message: '正在初始化 AI 图片生成...' });

        // 提取请求头
        const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
        
        // 初始化客户端
        const config = new Config();
        const client = new ImageGenerationClient(config, customHeaders);

        const views = [
          { type: 'main', name: '主视图' },
          { type: 'front', name: '正视图' },
          { type: 'side', name: '侧视图' },
          { type: 'back', name: '后视图' },
        ];

        // 构建生成请求
        const generatePromises = views.map(async (view, index) => {
          const viewPrompt = `${prompt}, ${VIEW_PROMPTS[view.type as keyof typeof VIEW_PROMPTS]}, 4K, high quality, realistic`;
          
          sendEvent({ type: 'progress', progress: 10 + index * 5, message: `准备生成${view.name}...` });

          try {
            const response = await client.generate({
              prompt: viewPrompt,
              size: '2K',
              watermark: false,
              image: referenceImage || undefined,
            });

            const helper = client.getResponseHelper(response);
            
            if (helper.success && helper.imageUrls.length > 0) {
              return {
                type: view.type,
                name: view.name,
                url: helper.imageUrls[0],
                success: true,
              };
            } else {
              console.error(`[${view.name}] Generation failed:`, helper.errorMessages);
              return {
                type: view.type,
                name: view.name,
                url: FALLBACK_IMAGES[view.type as keyof typeof FALLBACK_IMAGES],
                success: false,
                error: helper.errorMessages.join(', '),
              };
            }
          } catch (error) {
            console.error(`[${view.name}] Error:`, error);
            return {
              type: view.type,
              name: view.name,
              url: FALLBACK_IMAGES[view.type as keyof typeof FALLBACK_IMAGES],
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        // 并行生成所有视角
        sendEvent({ type: 'progress', progress: 30, message: '正在使用 AI 生成图片...' });

        const results = await Promise.all(generatePromises);

        // 发送结果
        results.forEach((result, index) => {
          const progress = 40 + index * 15;
          sendEvent({ type: 'progress', progress, message: `${result.name}生成完成` });
          sendEvent({ 
            type: 'image', 
            url: result.url, 
            imageType: result.type,
            isGenerated: result.success,
          });
        });

        // 统计成功数量
        const successCount = results.filter(r => r.success).length;
        const message = successCount === 4 
          ? '所有图片生成完成！' 
          : `图片生成完成（${successCount}/4 使用 AI 生成）`;

        sendEvent({ type: 'progress', progress: 100, message });
        sendEvent({ type: 'complete', successCount, totalCount: 4 });
        controller.close();

      } catch (error) {
        console.error('[Image Gen] Fatal error:', error);
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
