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

        const apiKey = process.env.COZE_API_KEY;
        if (!apiKey) {
          sendError('缺少 COZE_API_KEY 环境变量');
          return;
        }

        sendEvent({ type: 'progress', progress: 10, message: '正在生成图片...' });

        try {
          // 尝试 Coze V1 API（豆包图片生成）
          const response = await timeout(
            fetch('https://api.coze.cn/v1/images/generations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                prompt: `${prompt}, product photography, clean white background, high quality`,
                size: '1024x1024',
                n: 1,
              }),
            }),
            120000,
            '生成超时（120秒）'
          );

          const responseText = await response.text();
          console.log('[Image Gen] Response status:', response.status);
          console.log('[Image Gen] Response:', responseText.substring(0, 500));

          if (!response.ok) {
            // 如果 V1 也失败，尝试其他方式
            sendError(`API 错误 (${response.status}): ${responseText.substring(0, 200)}`);
            return;
          }

          const data = JSON.parse(responseText);

          // 解析响应
          let imageUrl = null;
          if (data.data && data.data[0]?.url) {
            imageUrl = data.data[0].url;
          } else if (data.data && data.data[0]?.b64_json) {
            imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
          }

          if (!imageUrl) {
            sendError('未能获取图片URL');
            return;
          }

          console.log('[Image Gen] Success:', imageUrl.substring(0, 50));
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
