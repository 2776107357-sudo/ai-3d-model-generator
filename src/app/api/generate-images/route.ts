import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 300; // Railway 支持 5 分钟

// 超时工具函数
function timeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(msg)), ms)
    )
  ]);
}

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
        try { controller.close(); } catch (e) {}
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

        // 检查环境变量
        const apiKey = process.env.COZE_API_KEY;
        if (!apiKey) {
          sendError('服务配置错误：缺少 COZE_API_KEY 环境变量');
          return;
        }
        console.log('[Image Gen] API Key found, length:', apiKey.length);

        // 提取请求头
        let customHeaders: Record<string, string> = {};
        try {
          customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
          console.log('[Image Gen] Headers extracted');
        } catch (e) {
          console.log('[Image Gen] Header extraction failed, using empty:', e);
        }
        
        // 初始化客户端
        console.log('[Image Gen] Initializing client...');
        const config = new Config();
        const client = new ImageGenerationClient(config, customHeaders);
        console.log('[Image Gen] Client initialized');

        // 简化提示词
        const mainPrompt = `${prompt}, product photography, clean white background, high quality`;
        
        sendEvent({ type: 'progress', progress: 10, message: '正在生成图片...' });
        sendEvent({ type: 'heartbeat', message: 'AI 正在创作中，请稍候...' });

        console.log('[Image Gen] Calling API with prompt:', mainPrompt.substring(0, 100));

        try {
          // 添加 90 秒超时
          const response = await timeout(
            client.generate({
              prompt: mainPrompt,
              size: '2K',
              watermark: false,
            }),
            90000,
            '图片生成超时（90秒），请重试'
          );

          console.log('[Image Gen] API response received');
          const helper = client.getResponseHelper(response);
          
          if (helper.success && helper.imageUrls.length > 0) {
            const imageUrl = helper.imageUrls[0];
            console.log('[Image Gen] Success, image URL:', imageUrl.substring(0, 50));
            
            sendEvent({ type: 'progress', progress: 50, message: '图片生成完成' });
            
            // 发送图片
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
            console.error('[Image Gen] Generation failed:', errorMsg);
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
