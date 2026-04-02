import { NextResponse } from 'next/server';
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function GET() {
  console.log('[Debug] Starting image generation test...');
  
  try {
    // 检查环境变量
    const apiKey = process.env.COZE_API_KEY;
    console.log('[Debug] COZE_API_KEY exists:', !!apiKey);
    console.log('[Debug] COZE_API_KEY length:', apiKey?.length || 0);
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'COZE_API_KEY not found in environment variables' 
      });
    }

    // 初始化客户端
    console.log('[Debug] Initializing ImageGenerationClient...');
    const config = new Config();
    const client = new ImageGenerationClient(config);
    
    // 发起请求
    console.log('[Debug] Calling generate API...');
    const startTime = Date.now();
    
    const response = await client.generate({
      prompt: 'a simple red apple on white background',
      size: '2K',
      watermark: false,
    });
    
    const duration = Date.now() - startTime;
    console.log('[Debug] API call completed in', duration, 'ms');
    
    const helper = client.getResponseHelper(response);
    
    if (helper.success && helper.imageUrls.length > 0) {
      console.log('[Debug] Success! Image URL:', helper.imageUrls[0]);
      return NextResponse.json({
        success: true,
        duration: `${duration}ms`,
        imageUrl: helper.imageUrls[0],
        message: 'Image generation test passed!'
      });
    } else {
      console.log('[Debug] Failed:', helper.errorMessages);
      return NextResponse.json({
        success: false,
        duration: `${duration}ms`,
        errors: helper.errorMessages
      });
    }
    
  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
