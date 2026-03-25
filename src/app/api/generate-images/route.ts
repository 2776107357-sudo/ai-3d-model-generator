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
  
  // 创建可读流
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
        const referenceImage = formData.get('referenceImage') as File | null;

        if (!prompt?.trim()) {
          sendError('请输入提示词');
          return;
        }

        // 初始化图片生成客户端
        const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
        const config = new Config();
        const client = new ImageGenerationClient(config, customHeaders);

        // 生成四个视角的提示词
        const viewPrompts = generateViewPrompts(prompt);
        
        // 如果有参考图，先上传获取URL（这里简化处理，实际需要上传到存储）
        let referenceImageUrl: string | undefined;
        if (referenceImage) {
          sendProgress(5, '处理参考图片...');
          // 将File转换为base64，这里简化处理
          // 实际项目中应该上传到对象存储获取URL
          const bytes = await referenceImage.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64 = buffer.toString('base64');
          referenceImageUrl = `data:${referenceImage.type};base64,${base64}`;
        }

        // 逐个生成图片
        for (let i = 0; i < viewPrompts.length; i++) {
          const view = viewPrompts[i];
          const progress = 10 + (i * 22);
          
          const viewNames: Record<string, string> = {
            main: '主视图',
            front: '正视图',
            side: '侧视图',
            back: '后视图',
          };
          
          sendProgress(progress, `正在生成${viewNames[view.type]}...`);

          try {
            // 生成图片
            const response = await client.generate({
              prompt: view.prompt,
              image: referenceImageUrl,
              size: '2K',
              watermark: false,
            });

            const helper = client.getResponseHelper(response);

            if (helper.success && helper.imageUrls.length > 0) {
              sendImage(helper.imageUrls[0], view.type);
            } else {
              console.error(`Failed to generate ${view.type}:`, helper.errorMessages);
              // 如果生成失败，继续尝试下一个
            }
          } catch (error) {
            console.error(`Error generating ${view.type}:`, error);
            // 继续生成其他视角
          }

          // 添加短暂延迟，避免请求过快
          if (i < viewPrompts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        sendProgress(100, '所有图片生成完成！');
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
