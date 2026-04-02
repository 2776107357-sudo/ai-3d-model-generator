import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 120;

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

      const sendError = (message: string) => {
        sendEvent({ type: 'error', message });
        controller.close();
      };

      try {
        const formData = await request.formData();
        const prompt = formData.get('prompt') as string;
        const referenceImage = formData.get('referenceImage') as string | null;

        if (!prompt?.trim()) {
          sendError('请输入提示词');
          return;
        }

        console.log('[Image Gen] Starting generation for prompt:', prompt);
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

        // 顺序生成每张图片（避免并发问题）
        const results = [];
        
        for (let i = 0; i < views.length; i++) {
          const view = views[i];
          const viewPrompt = `${prompt}, ${VIEW_PROMPTS[view.type as keyof typeof VIEW_PROMPTS]}, 4K, high quality, realistic`;
          
          sendEvent({ type: 'progress', progress: 10 + i * 20, message: `正在生成${view.name}...` });
          console.log(`[${view.name}] Generating with prompt:`, viewPrompt.substring(0, 100));

          try {
            const response = await client.generate({
              prompt: viewPrompt,
              size: '2K',
              watermark: false,
              image: referenceImage || undefined,
            });

            const helper = client.getResponseHelper(response);
            
            if (helper.success && helper.imageUrls.length > 0) {
              const imageUrl = helper.imageUrls[0];
              console.log(`[${view.name}] Success:`, imageUrl.substring(0, 50));
              
              results.push({
                type: view.type,
                name: view.name,
                url: imageUrl,
                success: true,
              });
              
              sendEvent({ 
                type: 'image', 
                url: imageUrl, 
                imageType: view.type,
                isGenerated: true,
              });
            } else {
              const errorMsg = helper.errorMessages.join(', ') || '生成失败';
              console.error(`[${view.name}] Generation failed:`, errorMsg);
              
              // 不再降级到本地图片，直接返回错误
              sendError(`${view.name}生成失败: ${errorMsg}`);
              return;
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[${view.name}] Error:`, errorMsg);
            
            // 不再降级到本地图片，直接返回错误
            sendError(`${view.name}生成失败: ${errorMsg}`);
            return;
          }
        }

        // 统计成功数量
        const successCount = results.filter(r => r.success).length;
        const message = `图片生成完成！共 ${successCount} 张`;

        sendEvent({ type: 'progress', progress: 100, message });
        sendEvent({ type: 'complete', successCount, totalCount: 4 });
        controller.close();

      } catch (error) {
        console.error('[Image Gen] Fatal error:', error);
        sendError(error instanceof Error ? error.message : '生成失败，请重试');
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
