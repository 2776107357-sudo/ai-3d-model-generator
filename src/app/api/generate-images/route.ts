import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

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

// 带超时的图片生成（使用 Promise.race 实现真正的超时控制）
async function generateImageWithTimeout(
  client: ImageGenerationClient,
  prompt: string,
  timeoutMs: number = 30000
): Promise<string | null> {
  console.log(`[Start] 开始生成: ${prompt.substring(0, 50)}...`);
  const startTime = Date.now();
  
  // 创建超时 Promise
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => {
      console.log(`[Timeout] ${timeoutMs/1000}秒超时`);
      reject(new Error(`生成超时（${timeoutMs/1000}秒）`));
    }, timeoutMs);
  });
  
  // 创建生成 Promise
  const generatePromise = async (): Promise<string | null> => {
    try {
      const response = await client.generate({
        prompt,
        size: '1024x1024', // 使用较小尺寸加快生成
        watermark: false,
        responseFormat: 'b64_json',
      });
      
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`[Done] 生成完成，耗时 ${elapsed.toFixed(1)}秒`);
      
      const helper = client.getResponseHelper(response);
      
      if (helper.success && helper.imageB64List.length > 0) {
        return `data:image/png;base64,${helper.imageB64List[0]}`;
      } else if (helper.success && helper.imageUrls.length > 0) {
        // 下载图片
        console.log(`[Download] 下载图片...`);
        const imageResponse = await fetch(helper.imageUrls[0]);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
      
      console.log(`[Warn] 无返回结果`);
      return null;
    } catch (error: any) {
      console.log(`[Error] SDK错误: ${error.message}`);
      throw error;
    }
  };
  
  // 使用 Promise.race 实现超时
  try {
    const result = await Promise.race([
      generatePromise(),
      timeoutPromise
    ]);
    return result;
  } catch (error: any) {
    console.log(`[Fail] ${error.message}`);
    return null; // 返回 null 而不是抛出错误，让调用方继续
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

        // 初始化客户端 - 显式传入 API Key
        const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
        
        // 检查环境变量
        const apiKey = process.env.COZE_API_KEY;
        console.log(`[Init] API Key 状态: ${apiKey ? '已配置' : '未配置'}`);
        
        // 创建配置，显式传入 API Key（如果环境变量中有）
        const config = apiKey ? new Config({ apiKey }) : new Config();
        const client = new ImageGenerationClient(config, customHeaders);
        
        console.log('[Init] 客户端初始化完成');

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
            // 使用30秒超时控制
            sendProgress(progress + 5, `正在调用豆包AI生成${viewNames[view.type]}...`);
            const imageUrl = await generateImageWithTimeout(client, view.prompt, 30000);
            
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
