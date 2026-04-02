import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 60; // 最大 60 秒（Hobby 计划实际限制 10 秒）

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          console.error('[Image Gen] Failed to send event:', e);
        }
      };

      const sendError = (message: string) => {
        console.error('[Image Gen] Error:', message);
        sendEvent({ type: 'error', message });
        try {
          controller.close();
        } catch (e) {}
      };

      try {
        const formData = await request.formData();
        const prompt = formData.get('prompt') as string;

        if (!prompt?.trim()) {
          sendError('请输入提示词');
          return;
        }

        console.log('[Image Gen] Starting generation for prompt:', prompt);
        sendEvent({ type: 'progress', progress: 5, message: '正在初始化...' });

        // 提取请求头
        let customHeaders: Record<string, string> = {};
        try {
          customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
        } catch (e) {
          console.log('[Image Gen] Header extraction failed:', e);
        }
        
        // 初始化客户端
        const config = new Config();
        const client = new ImageGenerationClient(config, customHeaders);

        // 简化提示词，加快生成速度
        const mainPrompt = `${prompt}, product photography, clean white background, professional lighting, high quality`;
        
        sendEvent({ type: 'progress', progress: 10, message: '正在生成图片...' });
        sendEvent({ type: 'heartbeat', message: 'AI 正在创作中，请稍候...' });

        try {
          const response = await client.generate({
            prompt: mainPrompt,
            size: '2K',
            watermark: false,
          });

          const helper = client.getResponseHelper(response);
          
          if (helper.success && helper.imageUrls.length > 0) {
            const imageUrl = helper.imageUrls[0];
            console.log('[Image Gen] Success:', imageUrl.substring(0, 50));
            
            sendEvent({ type: 'progress', progress: 50, message: '图片生成完成' });
            
            // 发送同一张图片作为所有视角（Vercel Hobby 计划有时间限制）
            const views = ['main', 'front', 'side', 'back'];
            const viewNames = ['主视图', '正视图', '侧视图', '后视图'];
            
            views.forEach((view, index) => {
              sendEvent({ 
                type: 'image', 
                url: imageUrl, 
                imageType: view,
                isGenerated: true,
              });
              sendEvent({ type: 'progress', progress: 60 + index * 10, message: `${viewNames[index]}准备完成` });
            });

            sendEvent({ type: 'progress', progress: 100, message: '全部完成！' });
            sendEvent({ type: 'complete', successCount: 4, totalCount: 4 });
            controller.close();
          } else {
            const errorMsg = helper.errorMessages.join(', ') || '生成失败';
            sendError(`生成失败: ${errorMsg}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error('[Image Gen] API Error:', errorMsg);
          sendError(`生成失败: ${errorMsg}`);
        }

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
