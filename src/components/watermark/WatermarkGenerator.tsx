'use client';

import { useState, useCallback, useRef } from 'react';
import {
  ImagePlus,
  Download,
  RefreshCw,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  addWatermark,
  generateUUID,
  DEFAULT_WATERMARK_CONFIG,
  WatermarkConfig,
} from '@/lib/watermark';

export function WatermarkGenerator() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUUID, setCurrentUUID] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // 处理水印生成
  const processWatermark = useCallback(async (imageSrc: string) => {
    setIsProcessing(true);
    try {
      const img = new Image();
      img.src = imageSrc;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
      });

      const uuid = generateUUID();
      setCurrentUUID(uuid);

      const config: WatermarkConfig = {
        ...DEFAULT_WATERMARK_CONFIG,
        uuid,
      };

      const result = await addWatermark(img, config);
      setWatermarkedImage(result);

      toast({ title: '水印生成成功', description: `UUID: ${uuid}` });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '水印生成过程中出错';
      toast({
        title: '生成失败',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  // 处理文件选择
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: '格式错误',
        description: '请选择图片文件（JPG、PNG、WEBP）',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: '文件过大',
        description: '图片大小不能超过 20MB',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setOriginalImage(dataUrl);
      setWatermarkedImage(null);
      await processWatermark(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [processWatermark, toast]);

  // input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [handleFile]);

  // 拖拽
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 重新生成（新UUID + 新时间）
  const handleRegenerate = useCallback(async () => {
    if (!originalImage) return;
    await processWatermark(originalImage);
  }, [originalImage, processWatermark]);

  // 下载图片
  const handleDownload = useCallback(() => {
    if (!watermarkedImage) return;
    const link = document.createElement('a');
    link.href = watermarkedImage;
    link.download = `watermark_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [watermarkedImage]);

  // 清除
  const handleClear = useCallback(() => {
    setOriginalImage(null);
    setWatermarkedImage(null);
    setCurrentUUID('');
  }, []);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ImagePlus className="w-7 h-7" />
            图片水印
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            上传图片自动添加仓库水印信息和追溯二维码
          </p>
        </div>
        {watermarkedImage && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isProcessing}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
              重新生成
            </Button>
            <Button size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              下载图片
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              清除
            </Button>
          </div>
        )}
      </div>

      {/* 上传区域 */}
      {!originalImage && (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <ImagePlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">点击或拖拽上传图片</h3>
          <p className="text-muted-foreground text-sm">
            支持 JPG、PNG、WEBP 格式，最大 20MB
          </p>
          <Button variant="outline" className="mt-4" type="button">
            <Upload className="mr-2 h-4 w-4" />
            选择图片
          </Button>
        </div>
      )}

      {/* 处理中 */}
      {isProcessing && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">正在生成水印...</p>
        </div>
      )}

      {/* 预览区域 */}
      {watermarkedImage && !isProcessing && (
        <div className="space-y-4">
          {/* UUID 信息条 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm flex items-center justify-between">
            <div>
              <span className="font-medium text-blue-900">追溯码 UUID：</span>
              <code className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded ml-1 text-xs">
                {currentUUID}
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 h-7"
              onClick={() => {
                navigator.clipboard.writeText(currentUUID);
                toast({ title: '已复制 UUID' });
              }}
            >
              复制
            </Button>
          </div>

          {/* 图片预览 */}
          <div className="bg-white rounded-lg border p-4">
            <img
              src={watermarkedImage}
              alt="带水印的图片"
              className="max-w-full h-auto mx-auto rounded shadow-sm"
              style={{ maxHeight: '70vh' }}
            />
          </div>

          {/* 底部操作按钮（移动端友好） */}
          <div className="flex gap-3 sm:hidden">
            <Button className="flex-1" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              下载图片
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleRegenerate} disabled={isProcessing}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              重新生成
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
