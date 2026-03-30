import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

// 生成不同视角的提示词
function generateViewPrompts(basePrompt: string): { type: string; prompt: string }[] {
  return [
    {
      type: 'main',
      prompt: `Product photography of ${basePrompt}, professional studio lighting, clean white background, high quality, detailed, 4k, commercial photography style`,
    },
    {
      type: 'front',
      prompt: `Front view of ${basePrompt}, orthographic projection, clean white background, product photography, studio lighting, detailed, 4k`,
    },
    {
      type: 'side',
      prompt: `Side view of ${basePrompt}, orthographic projection, clean white background, product photography, studio lighting, detailed, 4k`,
    },
    {
      type: 'back',
      prompt: `Back view of ${basePrompt}, orthographic projection, clean white background, product photography, studio lighting, detailed, 4k`,
    },
  ];
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: number, message: string) => {
        console.log(`[Progress] ${progress}%: ${message}`);
        const data = JSON.stringify({ type: 'progress', progress, message });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendImage = (url: string, imageType: string) => {
        console.log(`[Image] Sent ${imageType}`);
        const data = JSON.stringify({ type: 'image', url, imageType });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      const sendComplete = () => {
        const data = JSON.stringify({ type: 'complete' });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
      };

      const sendError = (message: string) => {
        console.error(`[Error] ${message}`);
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

        // 检查环境
        const hasApiKey = !!(process.env.COZE_API_KEY);
        console.log('[Env] COZE_API_KEY:', hasApiKey ? '已配置' : '未配置');
        console.log('[Env] COZE_BASE_URL:', process.env.COZE_BASE_URL || '未配置');

        sendProgress(5, '正在初始化豆包图片生成...');

        // 初始化客户端
        const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
        const config = new Config();
        const client = new ImageGenerationClient(config, customHeaders);

        const viewPrompts = generateViewPrompts(prompt);
        const viewNames: Record<string, string> = {
          main: '主视图',
          front: '正视图',
          side: '侧视图',
          back: '后视图',
        };

        let successCount = 0;
        
        for (let i = 0; i < viewPrompts.length; i++) {
          const view = viewPrompts[i];
          const progress = 10 + (i * 22);
          
          sendProgress(progress, `正在使用豆包生成${viewNames[view.type]}...`);

          try {
            // 使用 b64_json 格式直接返回 base64
            const response = await client.generate({
              prompt: view.prompt,
              size: '2K',
              watermark: false,
              responseFormat: 'b64_json',
            });

            const helper = client.getResponseHelper(response);
            console.log(`[Result] ${view.type}: success=${helper.success}, b64Length=${helper.imageB64List?.length}, urls=${helper.imageUrls?.length}, errors=${helper.errorMessages?.length}`);

            if (helper.success) {
              if (helper.imageB64List.length > 0) {
                // 直接使用 base64 数据
                const base64Image = `data:image/png;base64,${helper.imageB64List[0]}`;
                sendImage(base64Image, view.type);
                successCount++;
              } else if (helper.imageUrls.length > 0) {
                // 下载 URL 并转换为 base64
                sendProgress(progress + 5, `正在保存${viewNames[view.type]}...`);
                const imageResponse = await fetch(helper.imageUrls[0]);
                const arrayBuffer = await imageResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64 = buffer.toString('base64');
                const base64Image = `data:image/png;base64,${base64}`;
                sendImage(base64Image, view.type);
                successCount++;
              }
            } else {
              console.error(`[Failed] ${view.type}:`, helper.errorMessages);
            }
          } catch (error) {
            console.error(`[Error] ${view.type}:`, error);
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        }

        if (successCount === 0) {
          sendError('图片生成失败。可能原因：1) 未配置 COZE_API_KEY 环境变量 2) API 配额不足。请在 Vercel 中配置环境变量后重试。');
          return;
        }

        sendProgress(100, `图片生成完成！成功生成 ${successCount} 张图片`);
        sendComplete();
      } catch (error) {
        console.error('[Fatal Error]:', error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        sendError(`生成失败: ${errorMessage}。请确保在 Vercel 中配置了 COZE_API_KEY 环境变量。`);
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
