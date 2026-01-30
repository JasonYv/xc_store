import QRCode from 'qrcode';

/** 水印配置 */
export interface WatermarkConfig {
  warehouseName: string;
  address: string;
  phone: string;
  uuid: string;
}

/** 默认水印配置 */
export const DEFAULT_WATERMARK_CONFIG: Omit<WatermarkConfig, 'uuid'> = {
  warehouseName: '炫朝云仓（含冷库）',
  address: '新疆维吾尔自治区乌鲁木齐市沙依巴克区规划路沙依巴克区A加油西北50米(规划路北)',
  phone: '181*****635',
};

/** 生成标准 UUID v4（带 -） */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 获取当前时间字符串 YYYY-MM-DD HH:mm:ss */
export function getCurrentTimeString(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * 文本自动换行绘制
 * 返回实际绘制的行数
 */
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const chars = text.split('');
  let line = '';
  let lineCount = 0;

  for (let i = 0; i < chars.length; i++) {
    const testLine = line + chars[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = chars[i];
      lineCount++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y + lineCount * lineHeight);
  return lineCount + 1;
}

/**
 * 核心函数：为图片添加水印
 * @param imageSource - 已加载的 Image 元素
 * @param config - 水印配置
 * @returns 带水印图片的 Data URL
 */
export async function addWatermark(
  imageSource: HTMLImageElement,
  config: WatermarkConfig
): Promise<string> {
  const imgWidth = imageSource.naturalWidth;
  const imgHeight = imageSource.naturalHeight;

  // 1. 计算水印区域尺寸（覆盖在图片底部，不增加画布高度）
  const watermarkHeight = Math.min(Math.max(imgHeight * 0.22, 160), 300);
  const padding = watermarkHeight * 0.1;
  const qrSize = Math.floor(watermarkHeight - padding * 2);
  const overlayY = imgHeight - watermarkHeight; // 水印起始 Y 坐标

  // 2. 创建输出 Canvas（与原图同尺寸）
  const canvas = document.createElement('canvas');
  canvas.width = imgWidth;
  canvas.height = imgHeight;
  const ctx = canvas.getContext('2d')!;

  // 3. 绘制原图
  ctx.drawImage(imageSource, 0, 0, imgWidth, imgHeight);

  // 4. 绘制半透明暗色水印底条（覆盖在图片底部）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, overlayY, imgWidth, watermarkHeight);

  // 5. 计算字体大小
  const titleFontSize = Math.max(Math.floor(watermarkHeight * 0.14), 16);
  const bodyFontSize = Math.max(Math.floor(watermarkHeight * 0.11), 13);
  const lineHeight = Math.floor(bodyFontSize * 1.7);
  const textMaxWidth = imgWidth - qrSize - padding * 4;
  const fontFamily = '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif';

  // 6. 绘制左侧文字
  const textX = padding * 1.5;
  let currentY = overlayY + padding + titleFontSize;

  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'alphabetic';

  // 仓库名称（加粗、大字）
  ctx.font = `bold ${titleFontSize}px ${fontFamily}`;
  ctx.fillText(config.warehouseName, textX, currentY);
  currentY += lineHeight * 1.2;

  // 地址（自动换行）
  ctx.font = `${bodyFontSize}px ${fontFamily}`;
  const addressLines = drawWrappedText(
    ctx,
    config.address,
    textX,
    currentY,
    textMaxWidth,
    lineHeight
  );
  currentY += addressLines * lineHeight;

  // 时间
  ctx.fillText(getCurrentTimeString(), textX, currentY);
  currentY += lineHeight;

  // 手机号
  ctx.fillText(config.phone, textX, currentY);

  // 7. 生成并绘制右下角二维码
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, config.uuid, {
    width: qrSize,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  const qrX = imgWidth - qrSize - padding;
  const qrY = overlayY + padding;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // 8. 导出为 PNG Data URL
  return canvas.toDataURL('image/png');
}
