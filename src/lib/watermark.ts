import QRCode from 'qrcode';
import jsQR from 'jsqr';

/** 水印配置 */
export interface WatermarkConfig {
  warehouseName: string;
  address: string;
  phone: string;
  time: string;
  uuid: string;
  /** 可选：预裁剪好的二维码图片 Data URL（来自模版图片）。提供时不再生成新二维码 */
  qrImageDataUrl?: string | null;
}

/** 矩形区域（用于裁剪） */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 司机端名称可选项 */
export const WAREHOUSE_NAME_OPTIONS = [
  '炫朝云仓（含冷库）',
  '福建******场_多多买菜',
];

/** 地址可选项 */
export const ADDRESS_OPTIONS = [
  '新疆维吾尔自治区乌鲁木齐市沙依巴克区苜蓿沟北路沙依巴克区兵团农十二师一零四团苜...',
  '新疆维吾尔自治区乌鲁木齐市沙依巴克区苜蓿沟北路沙依巴克区兵团农十二师一零四团苜蓿沟社区',
  '新疆维吾尔自治区乌鲁木齐市沙依巴克区规划路沙依巴克区佳好文化发展有限公司北(规划...',
];

/** 默认水印配置 */
export const DEFAULT_WATERMARK_CONFIG: Omit<WatermarkConfig, 'uuid' | 'time'> = {
  warehouseName: WAREHOUSE_NAME_OPTIONS[0],
  address: ADDRESS_OPTIONS[0],
  phone: '181*****635',
};

/**
 * 生成指定日期当天 11:00 ~ 12:00 之间的随机时间字符串
 */
export function generateRandomTimeForDate(dateStr: string): string {
  // dateStr: YYYY-MM-DD
  const pad = (n: number) => n.toString().padStart(2, '0');
  // 11:00 ~ 11:59:59 之间随机
  const minutes = Math.floor(Math.random() * 60);
  const seconds = Math.floor(Math.random() * 60);
  return `${dateStr} 11:${pad(minutes)}:${pad(seconds)}`;
}

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
 * 文本按字符自动换行（不绘制，仅返回行数组）
 * @param maxLines 最大行数，超出截断并加 "..."
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = Infinity
): string[] {
  const lines: string[] = [];
  let line = '';
  let consumed = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = ch;
      consumed = i;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }

  if (lines.length < maxLines && line) {
    lines.push(line);
  } else if (lines.length === maxLines && consumed < text.length - 1) {
    // 超出最大行数，最后一行加省略号
    let last = lines[maxLines - 1];
    while (last.length > 0 && ctx.measureText(last + '...').width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + '...';
  }

  return lines;
}

/** 单行文本截断为指定宽度，超出加 "..." */
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/** 绘制圆角矩形路径 */
function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * 核心函数：为图片添加水印
 * 严格遵循多多买菜水印生成规格：
 * - 背景：#000000 透明度 0.5，圆角 8dp，无外边距
 * - 内边距：left/right/top/bottom = 16dp（新版模式）
 * - 字体：标题 16dp/22dp w600；地址/时间/手机号 14dp/20dp normal；颜色 #FAFAFA
 * - 行间距：4dp（项目间），段间 3dp
 * - 地址最多 2 行截断，标题最多 1 行截断
 * - 所有 dp 参数基于 360dp 设计基准宽度，按 imgWidth/360 缩放为像素
 *   （devicePixelRatio 默认 3.0 对应 1080px 图片）
 *
 * @param imageSource - 已加载的 Image 元素
 * @param config - 水印配置
 * @returns 带水印图片的 Data URL
 */
export async function addWatermark(
  imageSource: HTMLImageElement,
  config: WatermarkConfig
): Promise<string> {
  // === 统一裁剪到 1080×1440（3:4 竖图）===
  // 保证不同手机原图尺寸下水印效果一致
  const TARGET_W = 1080;
  const TARGET_H = 1440;
  const imgWidth = TARGET_W;
  const imgHeight = TARGET_H;

  // 基于 360dp 设计稿宽度的缩放比例（1dp = scale px）
  // 1080px 图片 → scale=3.0（典型手机 devicePixelRatio）
  const scale = Math.max(imgWidth / 360, 1);

  // === 字体参数（dp × scale = px） ===
  const titleFontSize = Math.round(19 * scale);    // 标题增大：16 → 19dp
  const titleLineHeight = Math.round(24 * scale);  // 标题行高 26 → 24
  const bodyFontSize = Math.round(14 * scale);     // fontBodyMedium
  const bodyLineHeight = Math.round(20 * scale);

  // === 容器内边距 ===
  const padLeft = Math.round(8 * scale);     // 文字距水印左边缩小：16 → 8dp
  const padRight = Math.round(8 * scale);    // QR 距水印右边
  const padTop = Math.round(13 * scale);     // 顶部内边距：6 → 13dp（增加水印高度约 10%）
  const padBottom = Math.round(11 * scale);  // 底部内边距：4 → 11dp
  const qrRightOffset = Math.round(6 * scale);  // QR 距水印右边：10 → 3dp（向右移约半个汉字宽度）
  // 外边距：左右对称
  const marginLeft = Math.round(16 * scale);
  const marginRight = marginLeft;
  const marginBottom = Math.round(8 * 1.2 * scale);  // 底部外边距 ×1.2
  const radius = Math.round(8 * 1.2 * scale);        // 圆角 ×1.2
  const itemGap = Math.round(4 * scale);     // 项目间 SizedBox(4)
  const sectionGap = Math.round(3 * scale);  // 段间 SizedBox(3)

  // === 颜色 ===
  const TEXT_COLOR = '#FAFAFA';              // textInWatermark
  const BG_COLOR = 'rgba(0, 0, 0, 0.25)';    // maskComponent + alpha 0.25（更通透）

  const fontFamily = '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif';

  // === 创建 Canvas（1080×1440 目标尺寸）===
  const canvas = document.createElement('canvas');
  canvas.width = imgWidth;
  canvas.height = imgHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 按 cover 模式裁剪原图填满 1080×1440（保持比例，居中裁剪）
  const srcW = imageSource.naturalWidth;
  const srcH = imageSource.naturalHeight;
  const srcRatio = srcW / srcH;
  const targetRatio = imgWidth / imgHeight;

  let sx = 0, sy = 0, sw = srcW, sh = srcH;
  if (srcRatio > targetRatio) {
    // 原图更宽，按高度匹配，左右裁剪
    sw = srcH * targetRatio;
    sx = (srcW - sw) / 2;
  } else {
    // 原图更高，按宽度匹配，上下裁剪
    sh = srcW / targetRatio;
    sy = (srcH - sh) / 2;
  }

  ctx.drawImage(imageSource, sx, sy, sw, sh, 0, 0, imgWidth, imgHeight);

  // === 二维码尺寸（48dp = 144px @3x） ===
  const qrSize = Math.round(40 * scale);

  // === 文字最大宽度 ===
  // 地址行宽度 = boxWidth - 30dp
  const boxWidth = imgWidth - marginLeft - marginRight;
  const textMaxWidth = boxWidth - Math.round(40 * scale);

  // 标题最多 1 行（截断）— 字重 light (300，比 normal 细一档)
  ctx.font = `320 ${titleFontSize}px ${fontFamily}`;
  const titleText = truncateText(ctx, config.warehouseName, textMaxWidth);

  // 地址最多 2 行（截断）— 字重 thin (200，更细)
  ctx.font = `360 ${bodyFontSize}px ${fontFamily}`;
  const addressLines = wrapTextLines(ctx, config.address, textMaxWidth, 2);

  // === 计算容器高度 ===
  const contentHeight =
    titleLineHeight + itemGap +
    addressLines.length * bodyLineHeight + sectionGap +
    bodyLineHeight + itemGap +
    bodyLineHeight;
  const boxHeight = contentHeight + padTop + padBottom;

  // 水印矩形位置（左外边距大、右小、底部紧凑 → 视觉上偏右下）
  const boxX = marginLeft;
  const boxY = imgHeight - boxHeight - marginBottom;

  // === 绘制圆角半透明背景 ===
  ctx.fillStyle = BG_COLOR;
  drawRoundedRectPath(ctx, boxX, boxY, boxWidth, boxHeight, radius);
  ctx.fill();

  // === 绘制文字 ===
  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = 'top';

  let y = boxY + padTop;
  const textX = boxX + padLeft;

  // 标题（19dp / 26dp / light 300）
  ctx.font = `330 ${titleFontSize}px ${fontFamily}`;
  ctx.fillText(titleText, textX, y);
  y += titleLineHeight + itemGap;

  // 地址 / 时间 / 手机号（14dp / 20dp / thin 200）
  ctx.font = `360 ${bodyFontSize}px ${fontFamily}`;
  for (const line of addressLines) {
    ctx.fillText(line, textX, y);
    y += bodyLineHeight;
  }
  y += sectionGap;

  // 时间（14dp / 20dp / normal）
  ctx.fillText(config.time, textX, y);
  y += bodyLineHeight + itemGap;

  // 手机号（14dp / 20dp / normal）
  ctx.fillText(config.phone, textX, y);

  // === 绘制二维码（36dp × 36dp） ===
  // 向左偏移：距右 16dp（不再贴右）
  // 向上偏移：底部留 16dp
  const qrX = boxX + boxWidth - qrSize - qrRightOffset;
  const qrY = boxY + boxHeight - qrSize - Math.round(16 * scale);

  if (config.qrImageDataUrl) {
    // 使用模版图片裁剪出来的二维码
    const qrImg = new Image();
    qrImg.src = config.qrImageDataUrl;
    await new Promise<void>((resolve, reject) => {
      qrImg.onload = () => resolve();
      qrImg.onerror = () => reject(new Error('二维码图片加载失败'));
    });
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } else {
    // 根据 UUID 生成新二维码（严格遵循 Flutter qr_flutter 默认规格）
    // - errorCorrectionLevel: L（低纠错，与 QrCode.fromData(data, null) 默认一致）
    // - version: 自动（按内容长度选择 QrVersions.auto）
    // - 模块/定位点形状: square（QrDataModuleShape.square）
    // - 模块/定位点颜色: #000000 黑色
    // - 背景色: #FFFFFF 白色
    // - margin: 0（无内边距，对应 EdgeInsets.all(0)）
    // - 容器: 36dp（@3x = 108px）
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, config.uuid, {
      errorCorrectionLevel: 'L',
      width: qrSize,
      margin: 0,
      color: {
        dark: '#000000FF',
        light: '#FFFFFFFF',
      },
    });
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
  }

  return canvas.toDataURL('image/png');
}

/**
 * 从图片中裁剪指定区域，返回 Data URL
 */
export async function cropImageRegion(
  imageDataUrl: string,
  rect: CropRect
): Promise<string> {
  const img = new Image();
  img.src = imageDataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('图片加载失败'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.w));
  canvas.height = Math.max(1, Math.round(rect.h));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    img,
    rect.x, rect.y, rect.w, rect.h,
    0, 0, canvas.width, canvas.height
  );
  return canvas.toDataURL('image/png');
}

/**
 * 在指定子区域内用 jsQR 检测二维码
 * 手机原图通常 3000-4000px，缩放上限提高到 2000，保留 QR 码细节
 * @returns 检测到的 QR 区域（坐标已映射回原图坐标系）
 */
function tryDetectInRegion(
  sourceImg: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetSize: number = 2000
): CropRect | null {
  // 只有当区域比目标尺寸还大时才缩小，否则保留原始分辨率
  const scale = Math.min(1, targetSize / Math.max(sw, sh));
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceImg, sx, sy, sw, sh, 0, 0, dw, dh);

  const imageData = ctx.getImageData(0, 0, dw, dh);
  const code = jsQR(imageData.data, dw, dh, { inversionAttempts: 'attemptBoth' });

  if (!code || !code.location) return null;

  const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = code.location;
  const corners = [topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner];
  const minXr = Math.min(...corners.map((c) => c.x));
  const maxXr = Math.max(...corners.map((c) => c.x));
  const minYr = Math.min(...corners.map((c) => c.y));
  const maxYr = Math.max(...corners.map((c) => c.y));

  // 映射回原图坐标
  const wOrig = (maxXr - minXr) / scale;
  const hOrig = (maxYr - minYr) / scale;
  const xOrig = sx + minXr / scale;
  const yOrig = sy + minYr / scale;

  // 紧贴 QR（外层 autoDetectQRArea 会再做整体偏移）
  const W = sourceImg.naturalWidth;
  const H = sourceImg.naturalHeight;
  const x = Math.max(0, Math.round(xOrig));
  const y = Math.max(0, Math.round(yOrig));
  const cw = Math.min(W - x, Math.round(wOrig));
  const ch = Math.min(H - y, Math.round(hOrig));

  return { x, y, w: cw, h: ch };
}

/**
 * 自动检测模版图片中二维码的位置
 * 针对手机拍摄的大图（3000-4000px）优化：
 * - 优先在原始分辨率裁切子区域，再传给 jsQR
 * - 候选区域聚焦水印典型位置（图片底部 20-25% + 右侧 30-50%）
 */
export async function autoDetectQRArea(imageDataUrl: string): Promise<CropRect | null> {
  const img = new Image();
  img.src = imageDataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('图片加载失败'));
  });

  const W = img.naturalWidth;
  const H = img.naturalHeight;
  console.log(`[QR 检测] 原图尺寸 ${W}×${H}`);

  // 候选区域（手机图：水印在底部 20-25%，QR 在水印右侧）
  // 子区域裁出后保持原始分辨率，给 jsQR 提供清晰的细节
  const regions: Array<[number, number, number, number, string]> = [
    // 1. 水印典型位置：底部 25% × 右半部分（最高命中率）
    [Math.floor(W * 0.5), Math.floor(H * 0.75), Math.ceil(W * 0.5), Math.ceil(H * 0.25), '底25%×右50%'],
    // 2. 水印更窄：底部 20% × 右 40%
    [Math.floor(W * 0.6), Math.floor(H * 0.78), Math.ceil(W * 0.4), Math.ceil(H * 0.22), '底22%×右40%'],
    // 3. 水印矮一点：底部 18% × 右 35%
    [Math.floor(W * 0.65), Math.floor(H * 0.8), Math.ceil(W * 0.35), Math.ceil(H * 0.2), '底20%×右35%'],
    // 4. 整张图（最后兜底）
    [0, 0, W, H, '整图'],
    // 5. 完整底部条带
    [0, Math.floor(H * 0.7), W, Math.ceil(H * 0.3), '底部30%条带'],
    // 6. 右下大区域
    [Math.floor(W * 0.4), Math.floor(H * 0.6), Math.ceil(W * 0.6), Math.ceil(H * 0.4), '右下60%'],
  ];

  // 全局裁剪偏移：整体右移 5% + 高度向下扩 5%
  const applyOffset = (rect: CropRect): CropRect => {
    const offsetX = rect.w * 0.05;
    const extendH = rect.h * 0.05;
    const newX = Math.max(0, Math.round(rect.x + offsetX));
    const newY = rect.y;
    const newW = Math.min(W - newX, rect.w);
    const newH = Math.min(H - newY, Math.round(rect.h + extendH));
    return { x: newX, y: newY, w: newW, h: newH };
  };

  for (const [sx, sy, sw, sh, label] of regions) {
    try {
      const result = tryDetectInRegion(img, sx, sy, sw, sh);
      if (result) {
        const adjusted = applyOffset(result);
        console.log(`[QR 检测] jsQR 命中: ${label}（区域 ${sw}×${sh}）原始=`, result, '偏移后=', adjusted);
        return adjusted;
      }
    } catch (err) {
      console.warn(`[QR 检测] 区域 ${label} 检测异常:`, err);
    }
  }

  // jsQR 全部失败，回退到启发式扫描
  console.log('[QR 检测] jsQR 失败，回退启发式扫描...');
  const heuristic = heuristicDetectQR(img);
  if (heuristic) {
    const adjusted = applyOffset(heuristic);
    console.log('[QR 检测] 启发式命中: 原始=', heuristic, '偏移后=', adjusted);
    return adjusted;
  }

  console.warn('[QR 检测] 所有方法均未识别到二维码');
  return null;
}

/**
 * 启发式 QR 码检测（jsQR 失败时回退使用）
 * 在右下区域用滑动窗口找"黑白边缘密集且接近正方形"的区域 — QR 码的特征
 * 针对手机大图，缩放到 800px 保留 QR 细节
 */
function heuristicDetectQR(img: HTMLImageElement): CropRect | null {
  const W = img.naturalWidth;
  const H = img.naturalHeight;

  // 手机大图缩到 800px 保留细节，但启发式扫描负担可控
  const targetW = 800;
  const scale = Math.min(1, targetW / W);
  const sw = Math.max(50, Math.round(W * scale));
  const sh = Math.max(50, Math.round(H * scale));

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, sw, sh);
  const data = ctx.getImageData(0, 0, sw, sh).data;

  // 二值化：白色=1
  const isWhite = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    const idx = i * 4;
    const b = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    isWhite[i] = b > 160 ? 1 : 0;
  }

  // 边缘图：黑白邻接
  const edges = new Uint8Array(sw * sh);
  for (let y = 0; y < sh - 1; y++) {
    for (let x = 0; x < sw - 1; x++) {
      const i = y * sw + x;
      if (isWhite[i] !== isWhite[i + 1] || isWhite[i] !== isWhite[i + sw]) {
        edges[i] = 1;
      }
    }
  }

  // 积分图加速区域统计
  const buildIntegral = (src: Uint8Array): Int32Array => {
    const integral = new Int32Array(sw * sh);
    for (let y = 0; y < sh; y++) {
      let rowSum = 0;
      for (let x = 0; x < sw; x++) {
        rowSum += src[y * sw + x];
        integral[y * sw + x] = rowSum + (y > 0 ? integral[(y - 1) * sw + x] : 0);
      }
    }
    return integral;
  };

  const whiteI = buildIntegral(isWhite);
  const edgeI = buildIntegral(edges);

  const queryRect = (integral: Int32Array, x1: number, y1: number, x2: number, y2: number): number => {
    let s = integral[y2 * sw + x2];
    if (x1 > 0) s -= integral[y2 * sw + (x1 - 1)];
    if (y1 > 0) s -= integral[(y1 - 1) * sw + x2];
    if (x1 > 0 && y1 > 0) s += integral[(y1 - 1) * sw + (x1 - 1)];
    return s;
  };

  // 滑动窗口搜索：手机图水印一般在底部 25%，QR 在水印右侧
  // QR 通常占图片 5%~15% 大小
  const minSize = Math.max(30, Math.floor(Math.min(sw, sh) * 0.04));
  const maxSize = Math.floor(Math.min(sw, sh) * 0.25);
  const step = Math.max(3, Math.floor(minSize / 5));
  const startX = Math.floor(sw * 0.5);
  const startY = Math.floor(sh * 0.7);  // 聚焦底部 30%

  let bestScore = 0;
  let best: { x: number; y: number; size: number } | null = null;

  for (let size = minSize; size <= maxSize; size += step) {
    for (let y = startY; y <= sh - size; y += step) {
      for (let x = startX; x <= sw - size; x += step) {
        const x2 = x + size - 1;
        const y2 = y + size - 1;
        const totalPixels = size * size;

        // 白色比例：QR 黑白交错，比例应该在 30~80% 之间
        const whiteCount = queryRect(whiteI, x, y, x2, y2);
        const whiteRatio = whiteCount / totalPixels;
        if (whiteRatio < 0.3 || whiteRatio > 0.85) continue;

        // 边缘密度：QR 内部黑白快速交替
        const edgeCount = queryRect(edgeI, x, y, x2, y2);
        const edgeDensity = edgeCount / totalPixels;
        if (edgeDensity < 0.12) continue;

        // 评分：边缘密度 × 区域大小（倾向于较大的方块）
        const score = edgeDensity * size;
        if (score > bestScore) {
          bestScore = score;
          best = { x, y, size };
        }
      }
    }
  }

  if (!best) return null;

  // 映射回原图坐标 — 紧贴二维码，不扩展边距
  const x = Math.max(0, Math.round(best.x / scale));
  const y = Math.max(0, Math.round(best.y / scale));
  const w = Math.min(W - x, Math.round(best.size / scale));
  const h = Math.min(H - y, Math.round(best.size / scale));

  return { x, y, w, h };
}
