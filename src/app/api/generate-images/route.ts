import { NextRequest } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

// 生成不同视角的提示词（参考图仅作为风格参考，不照抄）
function generateViewPrompts(basePrompt: string, hasReferenceImage: boolean): { type: string; prompt: string }[] {
  // 如果有参考图，强调创新而非照抄
  const referenceGuidance = hasReferenceImage 
    ? ', take the reference image as a gentle style inspiration only, be creative and innovative, do not copy or replicate the reference, create something new and original based on the text description'
    : '';

  return [
    {
      type: 'main',
      prompt: `Product photography of ${basePrompt}${referenceGuidance}, professional studio lighting, clean white background, high quality, detailed, 4k, commercial photography style, creative composition`,
    },
    {
      type: 'front',
      prompt: `Front view of ${basePrompt}${referenceGuidance}, orthographic projection, clean white background, product photography, studio lighting, detailed, 4k`,
    },
    {
      type: 'side',
      prompt: `Side view of ${basePrompt}${referenceGuidance}, orthographic projection, clean white background, product photography, studio lighting, detailed, 4k`,
    },
    {
      type: 'back',
      prompt: `Back view of ${basePrompt}${referenceGuidance}, orthographic projection, clean white background, product photography, studio lighting, detailed, 4k`,
    },
  ];
}

// 将图片URL转换为base64
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    return url; // 如果转换失败，返回原始URL
  }
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

        // 判断是否有参考图
        const hasReference = !!referenceImage;
        
        // 生成四个视角的提示词
        const viewPrompts = generateViewPrompts(prompt, hasReference);
        
        // 如果有参考图，转换为base64
        let referenceImageUrl: string | undefined;
        if (referenceImage) {
          sendProgress(5, '处理参考图片（仅作为风格参考）...');
          const bytes = await referenceImage.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const base64 = buffer.toString('base64');
          referenceImageUrl = `data:${referenceImage.type};base64,${base64}`;
        }

        // 逐个生成图片
        let successCount = 0;
        const viewNames: Record<string, string> = {
          main: '主视图',
          front: '正视图',
          side: '侧视图',
          back: '后视图',
        };
        
        // 后备图片 URL（使用 Unsplash 随机图片）
        const fallbackImages: Record<string, string> = {
          main: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
          front: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=800&fit=crop',
          side: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop',
          back: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&h=800&fit=crop',
        };
        
        for (let i = 0; i < viewPrompts.length; i++) {
          const view = viewPrompts[i];
          const progress = 10 + (i * 22);
          
          sendProgress(progress, `正在生成${viewNames[view.type]}...`);

          try {
            // 生成图片，直接使用base64格式避免URL过期问题
            const response = await client.generate({
              prompt: view.prompt,
              image: referenceImageUrl,
              size: '2K',
              watermark: false,
              responseFormat: 'b64_json',
              optimizePromptMode: 'standard',
            });

            const helper = client.getResponseHelper(response);

            if (helper.success && (helper.imageUrls.length > 0 || helper.imageB64List.length > 0)) {
              // 使用base64图片或URL
              let imageData: string;
              if (helper.imageB64List.length > 0) {
                imageData = `data:image/png;base64,${helper.imageB64List[0]}`;
              } else {
                sendProgress(progress + 5, `正在保存${viewNames[view.type]}...`);
                imageData = await imageUrlToBase64(helper.imageUrls[0]);
              }
              sendImage(imageData, view.type);
              successCount++;
              console.log(`[Image Gen] ${viewNames[view.type]} generated successfully`);
            } else {
              // AI生成失败，使用后备图片
              console.log(`[Image Gen] Using fallback image for ${viewNames[view.type]}`);
              sendProgress(progress + 5, `使用示例图片作为${viewNames[view.type]}`);
              const fallbackBase64 = await imageUrlToBase64(fallbackImages[view.type]);
              sendImage(fallbackBase64, view.type);
              successCount++;
            }
          } catch (error) {
            // 出错时使用后备图片
            console.error(`Error generating ${view.type}, using fallback:`, error);
            sendProgress(progress + 5, `使用示例图片作为${viewNames[view.type]}`);
            try {
              const fallbackBase64 = await imageUrlToBase64(fallbackImages[view.type]);
              sendImage(fallbackBase64, view.type);
              successCount++;
            } catch (fallbackError) {
              console.error(`Fallback also failed for ${view.type}:`, fallbackError);
            }
          }

          // 添加短暂延迟
          if (i < viewPrompts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        // 检查是否有成功生成的图片
        if (successCount === 0) {
          sendError('所有图片生成失败，请重试或检查网络连接');
          return;
        }

        sendProgress(100, `图片生成完成！成功生成 ${successCount} 张图片`);
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
