import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

// 生成不同视角的提示词
function generateViewPrompts(basePrompt: string): { type: string; prompt: string }[] {
  return [
    {
      type: 'main',
      prompt: `Product photography of ${basePrompt}, professional studio lighting, clean white background, high quality, detailed, 4k`,
    },
    {
      type: 'front',
      prompt: `Front view of ${basePrompt}, clean white background, product photography, detailed, 4k`,
    },
    {
      type: 'side',
      prompt: `Side view of ${basePrompt}, clean white background, product photography, detailed, 4k`,
    },
    {
      type: 'back',
      prompt: `Back view of ${basePrompt}, clean white background, product photography, detailed, 4k`,
    },
  ];
}

// 带超时的图片生成
async function generateImageWithTimeout(
  client: ImageGenerationClient,
  prompt: string,
  timeoutMs: number = 30000
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await client.generate({
      prompt,
      size: '2K',
      watermark: false,
      responseFormat: 'b64_json',
    });
    
    clearTimeout(timeoutId);
    
    const helper = client.getResponseHelper(response);
    
    if (helper.success && helper.imageB64List.length > 0) {
      return `data:image/png;base64,${helper.imageB64List[0]}`;
    } else if (helper.success && helper.imageUrls.length > 0) {
      // 下载图片
      const imageResponse = await fetch(helper.imageUrls[0]);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    }
    
    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

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
          
          sendProgress(progress, `正在生成${viewNames[view.type]}...`);

          try {
            // 使用超时控制
            const imageUrl = await generateImageWithTimeout(client, view.prompt, 60000);
            
            if (imageUrl) {
              sendImage(imageUrl, view.type);
              successCount++;
            } else {
              console.log(`[Skip] ${view.type}: 无返回结果`);
            }
          } catch (error: any) {
            console.error(`[Error] ${view.type}:`, error.message);
            // 继续生成下一张
          }

          // 短暂延迟
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (successCount === 0) {
          sendError('所有图片生成失败。请检查：1) Vercel 中是否配置了 COZE_API_KEY 2) API Key 是否有效 3) 网络是否正常');
          return;
        }

        sendProgress(100, `图片生成完成！成功生成 ${successCount} 张图片`);
        sendComplete();
      } catch (error: any) {
        console.error('[Fatal Error]:', error);
        sendError(`生成失败: ${error.message}`);
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
