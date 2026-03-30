import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('[Test Image] Starting test...');
  
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    console.log('[Test Image] Headers extracted');
    
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
      console.log('[Test Image] Generation failed:', helper.errorMessages);
      return NextResponse.json({
        success: false,
        error: '图片生成失败',
        details: helper.errorMessages,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Test Image] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
