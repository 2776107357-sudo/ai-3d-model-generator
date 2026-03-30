import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('[Test Image] Starting test...');
  
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    console.log('[Test Image] Headers extracted:', JSON.stringify(customHeaders).substring(0, 200));
    
    // 尝试获取环境变量配置
    const envInfo = {
      COZE_API_KEY: process.env.COZE_API_KEY ? '已配置' : '未配置',
      COZE_BASE_URL: process.env.COZE_BASE_URL || '未配置',
      NODE_ENV: process.env.NODE_ENV,
    };
    console.log('[Test Image] Environment:', envInfo);
    
    const config = new Config();
    console.log('[Test Image] Config created');
    
    const client = new ImageGenerationClient(config, customHeaders);
    console.log('[Test Image] Client initialized');
    
    // 生成一个简单的测试图片
    const response = await client.generate({
      prompt: 'A simple red apple on white background',
      size: '2K',
      watermark: false,
      responseFormat: 'b64_json',
    });
    console.log('[Test Image] Response received');
    
    const helper = client.getResponseHelper(response);
    console.log('[Test Image] Helper created, success:', helper.success);
    console.log('[Test Image] imageB64List length:', helper.imageB64List?.length);
    console.log('[Test Image] imageUrls length:', helper.imageUrls?.length);
    console.log('[Test Image] errorMessages:', helper.errorMessages);
    
    if (helper.success && helper.imageB64List.length > 0) {
      console.log('[Test Image] Image generated successfully');
      // 直接返回图片
      const imageData = helper.imageB64List[0];
      const buffer = Buffer.from(imageData, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'X-Test-Result': 'success',
        },
      });
    } else {
      console.log('[Test Image] Generation failed');
      return NextResponse.json({
        success: false,
        error: '图片生成失败',
        details: helper.errorMessages,
        envInfo,
        responseInfo: {
          hasData: !!response.data,
          dataLength: response.data?.length,
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Test Image] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
      envInfo: {
        COZE_API_KEY: process.env.COZE_API_KEY ? '已配置' : '未配置',
        COZE_BASE_URL: process.env.COZE_BASE_URL || '未配置',
      }
    }, { status: 500 });
  }
}
