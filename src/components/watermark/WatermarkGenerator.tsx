'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  ImagePlus,
  Download,
  RefreshCw,
  Trash2,
  Upload,
  Loader2,
  Wand2,
  QrCode,
  Scissors,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  addWatermark,
  generateUUID,
  cropImageRegion,
  autoDetectQRArea,
  WAREHOUSE_NAME_OPTIONS,
  ADDRESS_OPTIONS,
  WatermarkConfig,
  CropRect,
} from '@/lib/watermark';

// 获取当前时间字符串 YYYY-MM-DDTHH:mm（datetime-local 输入框格式）
function getNowDatetimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// 把 datetime-local 字符串 YYYY-MM-DDTHH:mm 转换为水印时间格式 YYYY-MM-DD HH:mm:ss
function formatDateTime(dtLocal: string): string {
  if (!dtLocal) return '';
  const [datePart, timePart = '00:00'] = dtLocal.split('T');
  const [hh = '00', mm = '00', ss = '00'] = timePart.split(':');
  return `${datePart} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}`;
}

export function WatermarkGenerator() {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const templateImgRef = useRef<HTMLImageElement>(null);

  // 原图相关
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUUID, setCurrentUUID] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // 模版图片相关
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [templateNaturalSize, setTemplateNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [qrCropPreview, setQrCropPreview] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number } | null>(null);

  // 表单状态
  const [warehouseName, setWarehouseName] = useState<string>(WAREHOUSE_NAME_OPTIONS[0]);
  const [address, setAddress] = useState<string>(ADDRESS_OPTIONS[0]);
  const [datetime, setDatetime] = useState<string>(getNowDatetimeLocal());
  const [phonePrefix, setPhonePrefix] = useState<string>('181');
  const [phoneSuffix, setPhoneSuffix] = useState<string>('635');

  const fullPhone = useMemo(() => `${phonePrefix}*****${phoneSuffix}`, [phonePrefix, phoneSuffix]);

  // ============== 原图上传 ==============
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: '格式错误', description: '请选择图片文件', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: '文件过大', description: '图片大小不能超过 20MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setWatermarkedImage(null);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ============== 模版图片上传 + 自动检测 ==============
  const handleTemplateFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: '格式错误', description: '请选择图片文件', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: '文件过大', description: '模版大小不能超过 20MB', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setTemplateImage(dataUrl);
      setQrCropPreview(null);
      setCropRect(null);

      // 加载尺寸
      const img = new Image();
      img.onload = async () => {
        setTemplateNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });

        // 自动检测二维码位置
        try {
          const detected = await autoDetectQRArea(dataUrl);
          if (detected) {
            setCropRect(detected);
            // 自动应用裁剪
            const cropped = await cropImageRegion(dataUrl, detected);
            setQrCropPreview(cropped);
            toast({ title: '已自动识别二维码区域', description: '可手动调整裁剪框' });
          } else {
            // 默认裁剪：右下角约 1/8 大小
            const defaultSize = Math.round(img.naturalWidth / 8);
            setCropRect({
              x: img.naturalWidth - defaultSize - Math.round(img.naturalWidth * 0.02),
              y: img.naturalHeight - defaultSize - Math.round(img.naturalHeight * 0.02),
              w: defaultSize,
              h: defaultSize,
            });
            toast({ title: '请手动调整裁剪框', description: '未自动检测到二维码', variant: 'destructive' });
          }
        } catch (err) {
          console.error('自动检测失败', err);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleTemplateFile(file);
    if (templateInputRef.current) templateInputRef.current.value = '';
  };

  // 拖拽裁剪框
  const getImageCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!templateImgRef.current || !templateNaturalSize) return null;
    const rect = templateImgRef.current.getBoundingClientRect();
    const scaleX = templateNaturalSize.w / rect.width;
    const scaleY = templateNaturalSize.h / rect.height;
    return {
      x: Math.max(0, Math.min(templateNaturalSize.w, (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(templateNaturalSize.h, (clientY - rect.top) * scaleY)),
    };
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getImageCoords(e.clientX, e.clientY);
    if (!coords) return;
    setIsCropping(true);
    setCropDragStart(coords);
    setCropRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || !cropDragStart) return;
    const coords = getImageCoords(e.clientX, e.clientY);
    if (!coords) return;
    setCropRect({
      x: Math.min(cropDragStart.x, coords.x),
      y: Math.min(cropDragStart.y, coords.y),
      w: Math.abs(coords.x - cropDragStart.x),
      h: Math.abs(coords.y - cropDragStart.y),
    });
  };

  const handleCropMouseUp = () => {
    setIsCropping(false);
  };

  const handleApplyCrop = async () => {
    if (!templateImage || !cropRect || cropRect.w < 5 || cropRect.h < 5) {
      toast({ title: '裁剪区域太小', variant: 'destructive' });
      return;
    }
    try {
      const cropped = await cropImageRegion(templateImage, cropRect);
      setQrCropPreview(cropped);
      toast({ title: '二维码裁剪成功' });
    } catch (err) {
      toast({
        title: '裁剪失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  const handleClearTemplate = () => {
    setTemplateImage(null);
    setTemplateNaturalSize(null);
    setCropRect(null);
    setQrCropPreview(null);
  };

  // ============== 生成水印 ==============
  const validateForm = (): string | null => {
    if (!originalImage) return '请先上传原图';
    if (!warehouseName.trim()) return '请选择标题';
    if (!address.trim()) return '请选择地址';
    if (!datetime) return '请输入日期时间';
    if (!/^\d{3}$/.test(phonePrefix)) return '手机号前3位必须是数字';
    if (!/^\d{3}$/.test(phoneSuffix)) return '手机号后3位必须是数字';
    return null;
  };

  const handleGenerate = useCallback(async () => {
    const errMsg = validateForm();
    if (errMsg) {
      toast({ title: '提示', description: errMsg, variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      const img = new Image();
      img.src = originalImage!;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
      });

      const uuid = qrCropPreview ? '' : generateUUID();
      setCurrentUUID(uuid);

      const config: WatermarkConfig = {
        warehouseName,
        address,
        phone: fullPhone,
        time: formatDateTime(datetime),
        uuid,
        qrImageDataUrl: qrCropPreview,
      };

      const result = await addWatermark(img, config);
      setWatermarkedImage(result);

      toast({
        title: '水印生成成功',
        description: qrCropPreview ? '已使用模版二维码' : `UUID: ${uuid}`,
      });
    } catch (error) {
      toast({
        title: '生成失败',
        description: error instanceof Error ? error.message : '生成过程出错',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage, qrCropPreview, warehouseName, address, datetime, fullPhone, phonePrefix, phoneSuffix, toast]);

  const handleDownload = () => {
    if (!watermarkedImage) return;
    const link = document.createElement('a');
    link.href = watermarkedImage;
    link.download = `watermark_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    setOriginalImage(null);
    setWatermarkedImage(null);
    setCurrentUUID('');
  };

  // 全局鼠标事件（裁剪超出图片范围时也能 mouseup）
  useEffect(() => {
    if (!isCropping) return;
    const onUp = () => setIsCropping(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [isCropping]);

  // 计算裁剪框在显示坐标下的位置（百分比）
  const cropOverlayStyle = useMemo(() => {
    if (!cropRect || !templateNaturalSize) return null;
    return {
      left: `${(cropRect.x / templateNaturalSize.w) * 100}%`,
      top: `${(cropRect.y / templateNaturalSize.h) * 100}%`,
      width: `${(cropRect.w / templateNaturalSize.w) * 100}%`,
      height: `${(cropRect.h / templateNaturalSize.h) * 100}%`,
    };
  }, [cropRect, templateNaturalSize]);

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
            支持从模版图片中提取真实二维码，给原图加上完整水印
          </p>
        </div>
      </div>

      {/* 模版图片区 */}
      <div className="bg-white rounded-lg border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">模版图片（可选）</h3>
            <span className="text-xs text-muted-foreground">
              上传带水印的图片，自动提取右下角二维码
            </span>
          </div>
          <div className="flex gap-2">
            <input
              ref={templateInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleTemplateChange}
            />
            <Button variant="outline" size="sm" onClick={() => templateInputRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" />
              {templateImage ? '更换模版' : '上传模版'}
            </Button>
            {templateImage && (
              <Button variant="ghost" size="sm" onClick={handleClearTemplate}>
                <X className="mr-1.5 h-4 w-4" />
                清除
              </Button>
            )}
          </div>
        </div>

        {templateImage && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 模版预览 + 裁剪 */}
            <div className="lg:col-span-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                在图片上拖拽鼠标可重新框选二维码区域
              </p>
              <div
                className="relative inline-block max-w-full select-none cursor-crosshair border rounded overflow-hidden"
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
              >
                <img
                  ref={templateImgRef}
                  src={templateImage}
                  alt="模版"
                  className="max-w-full h-auto block pointer-events-none"
                  style={{ maxHeight: '500px' }}
                  draggable={false}
                />
                {cropOverlayStyle && (
                  <div
                    className="absolute border-2 border-red-500 bg-red-500/10 pointer-events-none"
                    style={cropOverlayStyle}
                  />
                )}
              </div>
              <Button size="sm" onClick={handleApplyCrop} disabled={!cropRect || cropRect.w < 5}>
                <Scissors className="mr-1.5 h-4 w-4" />
                应用裁剪
              </Button>
            </div>

            {/* 二维码预览 */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">已提取的二维码</p>
              {qrCropPreview ? (
                <div className="border rounded p-3 bg-gray-50 flex flex-col items-center gap-2">
                  <img
                    src={qrCropPreview}
                    alt="提取的二维码"
                    className="max-w-full max-h-48 object-contain"
                  />
                  <p className="text-xs text-green-700">✓ 将用于原图水印</p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded p-6 text-center text-xs text-muted-foreground">
                  暂未提取二维码
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 上传原图 + 表单 */}
      {!originalImage ? (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
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
          <h3 className="text-lg font-semibold mb-2">点击或拖拽上传原图</h3>
          <p className="text-muted-foreground text-sm">支持 JPG、PNG、WEBP 格式，最大 20MB</p>
          <Button variant="outline" className="mt-4" type="button">
            <Upload className="mr-2 h-4 w-4" />
            选择图片
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：原图预览 */}
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">原图预览</h3>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                  <Upload className="mr-1.5 h-4 w-4" />
                  重新上传
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  清除
                </Button>
              </div>
            </div>
            <img
              src={originalImage}
              alt="原图"
              className="max-w-full h-auto mx-auto rounded"
              style={{ maxHeight: '50vh' }}
            />
          </div>

          {/* 右侧：水印信息表单 */}
          <div className="bg-white rounded-lg border p-6 space-y-5">
            <h3 className="font-semibold text-sm">水印信息</h3>

            <div className="space-y-2">
              <Label htmlFor="warehouseName">标题（司机端名称）</Label>
              <Select value={warehouseName} onValueChange={setWarehouseName}>
                <SelectTrigger id="warehouseName">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WAREHOUSE_NAME_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">地址</Label>
              <Select value={address} onValueChange={setAddress}>
                <SelectTrigger id="address">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      <span className="text-xs">{opt}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="datetime">日期时间（手动输入，YYYY-MM-DD HH:mm:ss）</Label>
              <Input
                id="datetime"
                type="datetime-local"
                step={1}
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                水印显示：<code className="bg-muted px-1.5 py-0.5 rounded">{formatDateTime(datetime) || '—'}</code>
              </p>
            </div>

            <div className="space-y-2">
              <Label>手机号</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={phonePrefix}
                  onChange={(e) => setPhonePrefix(e.target.value.replace(/\D/g, ''))}
                  className="w-20 text-center"
                  placeholder="181"
                />
                <span className="text-muted-foreground text-sm tracking-widest">*****</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={phoneSuffix}
                  onChange={(e) => setPhoneSuffix(e.target.value.replace(/\D/g, ''))}
                  className="w-20 text-center"
                  placeholder="635"
                />
                <span className="text-xs text-muted-foreground ml-2">
                  完整：<code className="bg-muted px-1.5 py-0.5 rounded">{fullPhone}</code>
                </span>
              </div>
            </div>

            {/* 二维码来源提示 */}
            <div className={`text-xs p-2 rounded border ${
              qrCropPreview
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              {qrCropPreview
                ? '二维码：使用模版图片中提取的二维码'
                : '二维码：将自动生成新 UUID（如需使用真实二维码请上传模版图片）'}
            </div>

            <div className="pt-2">
              <Button className="w-full" onClick={handleGenerate} disabled={isProcessing}>
                {isProcessing
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Wand2 className="mr-1.5 h-4 w-4" />}
                {watermarkedImage ? '重新生成水印' : '生成水印'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 处理中 */}
      {isProcessing && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">正在生成水印...</p>
        </div>
      )}

      {/* 水印结果 */}
      {watermarkedImage && !isProcessing && (
        <div className="space-y-4">
          {currentUUID && (
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
          )}

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">水印效果预览</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isProcessing}>
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  重新生成
                </Button>
                <Button size="sm" onClick={handleDownload}>
                  <Download className="mr-1.5 h-4 w-4" />
                  下载图片
                </Button>
              </div>
            </div>
            <img
              src={watermarkedImage}
              alt="带水印的图片"
              className="max-w-full h-auto mx-auto rounded shadow-sm"
              style={{ maxHeight: '70vh' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
