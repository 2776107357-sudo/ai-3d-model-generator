'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Box,
  Loader2,
  Camera,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// 动态导入3D预览组件，避免SSR问题
const ModelViewer = dynamic(() => import('@/components/ModelViewer'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-muted rounded-lg">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  )
});

type Step = 'input' | 'generating-images' | 'review-images' | 'generating-3d' | 'complete';

interface GeneratedImage {
  url: string;
  type: 'main' | 'front' | 'side' | 'back';
}

interface Model3D {
  url: string;
  format: string;
  previewUrl?: string;
}

export default function Home() {
  const [step, setStep] = useState<Step>('input');
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [model3D, setModel3D] = useState<Model3D | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理图片上传
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('请上传图片文件');
        return;
      }
      setReferenceImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // 生成图片
  const handleGenerateImages = async () => {
    if (!prompt.trim()) {
      toast.error('请输入提示词');
      return;
    }

    setStep('generating-images');
    setProgress(10);
    setStatusText('正在准备生成图片...');

    try {
      // 准备表单数据
      const formData = new FormData();
      formData.append('prompt', prompt);
      if (referenceImageFile) {
        formData.append('referenceImage', referenceImageFile);
      }

      setProgress(20);
      setStatusText('正在生成主视图...');

      const response = await fetch('/api/generate-images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成图片失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'progress') {
                  setProgress(data.progress);
                  setStatusText(data.message);
                } else if (data.type === 'image') {
                  setGeneratedImages(prev => [...prev, {
                    url: data.url,
                    type: data.imageType
                  }]);
                } else if (data.type === 'complete') {
                  setProgress(100);
                  setStatusText('图片生成完成！');
                  setStep('review-images');
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Generate images error:', error);
      toast.error(error instanceof Error ? error.message : '生成图片失败');
      setStep('input');
      setProgress(0);
    }
  };

  // 重新生成图片
  const handleRegenerateImages = () => {
    setGeneratedImages([]);
    handleGenerateImages();
  };

  // 确认满意，生成3D模型
  const handleConfirmAndGenerate3D = async () => {
    setStep('generating-3d');
    setProgress(10);
    setStatusText('正在准备生成3D模型...');

    try {
      const mainImage = generatedImages.find(img => img.type === 'main');
      
      if (!mainImage) {
        throw new Error('未找到主图');
      }

      setProgress(20);
      setStatusText('正在上传图片到Tripo AI...');

      const response = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: mainImage.url,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '生成3D模型失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'progress') {
                  setProgress(data.progress);
                  setStatusText(data.message);
                } else if (data.type === 'model') {
                  setModel3D({
                    url: data.url,
                    format: data.format,
                    previewUrl: data.previewUrl,
                  });
                } else if (data.type === 'complete') {
                  setProgress(100);
                  setStatusText('3D模型生成完成！');
                  setStep('complete');
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Generate 3D error:', error);
      toast.error(error instanceof Error ? error.message : '生成3D模型失败');
      setStep('review-images');
      setProgress(0);
    }
  };

  // 下载模型
  const handleDownloadModel = async () => {
    if (!model3D) return;
    
    try {
      const response = await fetch(model3D.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `model_${Date.now()}.glb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('模型下载成功！');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('下载失败');
    }
  };

  // 重新开始
  const handleReset = () => {
    setStep('input');
    setPrompt('');
    setReferenceImage(null);
    setReferenceImageFile(null);
    setGeneratedImages([]);
    setModel3D(null);
    setProgress(0);
    setStatusText('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Box className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AI 3D模型生成器
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            输入描述或上传参考图，一键生成高质量3D模型
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['输入提示词', '生成图片', '确认效果', '生成3D模型', '完成'].map((label, index) => (
            <div key={label} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index < ['input', 'generating-images', 'review-images', 'generating-3d', 'complete'].indexOf(step) + 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {index < ['input', 'generating-images', 'review-images', 'generating-3d', 'complete'].indexOf(step) 
                  ? <CheckCircle className="w-4 h-4" />
                  : index + 1}
              </div>
              {index < 4 && (
                <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <Card className="backdrop-blur-sm bg-card/50 border-2">
          <CardContent className="p-6">
            {/* Step 1: Input */}
            {step === 'input' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">描述你想生成的物品</label>
                  <Textarea
                    placeholder="例如：一个复古风格的陶瓷花瓶，带有精美的花纹装饰..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    上传参考图（可选）
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    {referenceImage ? (
                      <div className="relative w-48 h-48 mx-auto">
                        <img 
                          src={referenceImage} 
                          alt="参考图" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReferenceImage(null);
                            setReferenceImageFile(null);
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload className="w-12 h-12 mx-auto mb-2" />
                        <p>点击上传参考图片</p>
                        <p className="text-xs mt-1">支持 JPG、PNG 格式</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <Button 
                  onClick={handleGenerateImages}
                  disabled={!prompt.trim()}
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  开始生成图片
                </Button>
              </div>
            )}

            {/* Step 2: Generating Images */}
            {step === 'generating-images' && (
              <div className="space-y-6 py-8">
                <div className="text-center">
                  <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">正在生成图片</h3>
                  <p className="text-muted-foreground">{statusText}</p>
                </div>
                <Progress value={progress} className="h-2" />
                
                {generatedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {generatedImages.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-primary">
                        <img src={img.url} alt={img.type} className="w-full h-full object-cover" />
                        <Badge className="absolute bottom-2 left-2" variant="secondary">
                          {img.type === 'main' ? '主视图' : 
                           img.type === 'front' ? '正视图' : 
                           img.type === 'side' ? '侧视图' : '后视图'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review Images */}
            {step === 'review-images' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-semibold mb-2">图片生成完成！</h3>
                  <p className="text-muted-foreground">请确认生成的图片是否满意</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {generatedImages.map((img, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 hover:border-primary transition-colors">
                      <img src={img.url} alt={img.type} className="w-full h-full object-cover" />
                      <Badge className="absolute bottom-2 left-2" variant="secondary">
                        {img.type === 'main' ? '主视图' : 
                         img.type === 'front' ? '正视图' : 
                         img.type === 'side' ? '侧视图' : '后视图'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={handleRegenerateImages}
                    className="px-8"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新生成
                  </Button>
                  <Button 
                    onClick={handleConfirmAndGenerate3D}
                    className="px-8"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    满意，生成3D模型
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Generating 3D */}
            {step === 'generating-3d' && (
              <div className="space-y-6 py-8">
                <div className="text-center">
                  <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">正在生成3D模型</h3>
                  <p className="text-muted-foreground">{statusText}</p>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Step 5: Complete */}
            {step === 'complete' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">3D模型生成完成！</h3>
                  <p className="text-muted-foreground">可以预览和下载您的3D模型</p>
                </div>

                {/* 3D Model Preview */}
                {model3D && (
                  <div className="space-y-4">
                    <div className="rounded-lg overflow-hidden border-2 bg-muted/30">
                      <ModelViewer modelUrl={model3D.url} />
                    </div>

                    {/* Reference Images */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">参考图片</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {generatedImages.map((img, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                            <img src={img.url} alt={img.type} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 justify-center">
                      <Button onClick={handleDownloadModel} className="px-8">
                        <Download className="w-4 h-4 mr-2" />
                        下载模型 (GLB)
                      </Button>
                      <Button variant="outline" onClick={handleReset} className="px-8">
                        重新开始
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>使用 AI 图像生成 + Tripo AI 3D建模技术</p>
        </div>
      </div>
    </div>
  );
}
