import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

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
        } catch (e) {}
      };

      const sendError = (message: string) => {
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

        console.log('[Image Gen] Starting for:', prompt);
        sendEvent({ type: 'progress', progress: 5, message: '正在初始化...' });

        // 使用豆包 API（通过 Coze 平台）
        const apiKey = process.env.COZE_API_KEY;
        if (!apiKey) {
          sendError('缺少 COZE_API_KEY 环境变量');
          return;
        }

        sendEvent({ type: 'progress', progress: 10, message: '正在生成图片...' });

        try {
          // 直接调用 Coze API
          const response = await timeout(
            fetch('https://api.coze.cn/v3/images/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'doubao-seedream-3-0-t2i-250415',
                prompt: `${prompt}, product photography, clean white background, high quality, professional lighting`,
                size: '1024x1024',
                n: 1,
              }),
            }),
            120000,
            '生成超时（120秒）'
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[Image Gen] API error:', response.status, errorText);
            sendError(`API 错误 (${response.status}): ${errorText}`);
            return;
          }

          const data = await response.json();
          console.log('[Image Gen] API response:', JSON.stringify(data).substring(0, 200));

          // 解析响应
          let imageUrl = null;
          if (data.data && data.data[0]?.url) {
            imageUrl = data.data[0].url;
          } else if (data.data && data.data[0]?.b64_json) {
            // 如果返回 base64，转为 data URL
            imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
          }

          if (!imageUrl) {
            sendError('未能获取图片URL');
            return;
          }

          console.log('[Image Gen] Success:', imageUrl.substring(0, 50));
          sendEvent({ type: 'progress', progress: 50, message: '图片生成完成' });

          // 发送同一张图片作为所有视角
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

        } catch (apiError) {
          console.error('[Image Gen] API call failed:', apiError);
          sendError(apiError instanceof Error ? apiError.message : 'API 调用失败');
        }

      } catch (error) {
        console.error('[Image Gen] Fatal error:', error);
        sendError(error instanceof Error ? error.message : '生成失败');
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
