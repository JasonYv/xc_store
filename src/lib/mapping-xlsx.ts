import ExcelJS from 'exceljs';
import type { ProductMapping, ProductMappingFormData } from '@/lib/types';

// 商品映射表的 xlsx 导入/导出。
//
// 表头别名必须和桌面端 app/task/mapping_reader.py 的 COLUMN_ALIASES 保持一致——
// 两边认的表头不一样的话，用户从后台导出的文件在桌面端读不出来，或者反过来。
// 改这里时请同步改那边，反之亦然。

/** 导入时每一列能认的表头名（都先归一化：去空白 + 转小写）。 */
export const MAPPING_COLUMN_ALIASES: Record<string, string[]> = {
  dispatchName: ['派单表商品名称', '派单商品名称', '派单商品名', '派单名称', '云仓商品名称', '云仓商品名'],
  listCode: ['金蝶代码', '商品代码', 'erp代码', '金蝶编码'],
  pddName: ['多多商品名称', '多多买菜商品名称', '多多商品名', '商品名称', '商品名'],
  productId: ['productid', '商品码', '商品编码', '多多买菜商品id', '多多商品id', '商品id'],
  spec: ['规格', '单位', '商品规格'],
  boxSpec: ['箱规', '装箱规格', '箱规格', '每箱数量'],
  category: ['商品大类', '大类', '品类', '商品类别', '类别'],
};

/** 导出时的表头顺序。这几个名字都在上面的别名表里，所以导出的文件能再次导入（往返一致）。 */
export const MAPPING_EXPORT_HEADERS: { key: keyof ProductMappingFormData; title: string }[] = [
  { key: 'dispatchName', title: '派单表商品名称' },
  { key: 'pddName', title: '多多商品名称' },
  { key: 'productId', title: 'productId' },
  { key: 'spec', title: '规格' },
  { key: 'listCode', title: '金蝶代码' },
  { key: 'boxSpec', title: '箱规' },
  { key: 'category', title: '商品大类' },
];

/** 表头一个都认不出时的固定位置读法（与桌面端 FALLBACK_POSITIONS 一致）。 */
const FALLBACK_POSITIONS: Record<string, number> = {
  dispatchName: 0,
  pddName: 1,
  productId: 2,
  spec: 3,
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, '').toLowerCase();
}

/**
 * 把单元格值转成字符串。
 *
 * 和桌面端 _clean_product_id 同样的坑：Excel 会把纯数字的商品码存成浮点，
 * 读出来是 567251000000 而不是 "567251000000"，甚至科学计数法。
 * 这里统一去空白、去尾随的 .0，保证两边拿到的字符串一模一样。
 */
function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    // 整数（含被 Excel 存成 1001.0 的）走整数写法，避免出现 "1001.0"
    if (Number.isInteger(value)) return String(value);
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  // exceljs 的富文本 / 公式单元格：取纯文本
  if (typeof value === 'object') {
    const rich = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (Array.isArray(rich.richText)) return rich.richText.map(r => r.text).join('');
    if (rich.text !== undefined) return String(rich.text);
    if (rich.result !== undefined) return cellToString(rich.result);
    return '';
  }
  return String(value).trim();
}

/** 读第一张工作表为「一行一个对象」的二维数组。 */
function sheetToMatrix(worksheet: ExcelJS.Worksheet): string[][] {
  const matrix: string[][] = [];
  worksheet.eachRow({ includeEmpty: false }, row => {
    const values: string[] = [];
    // exceljs 的 row.values 是 1-based 的稀疏数组，index 0 是空的
    const raw = row.values as unknown[];
    const width = Math.max(raw.length - 1, 1);
    for (let col = 1; col <= width; col += 1) {
      values.push(cellToString(raw[col]));
    }
    matrix.push(values);
  });
  return matrix;
}

/** 由表头行解析出「字段 → 列下标」。一个都认不出时返回固定位置读法。 */
export function resolveColumns(header: string[]): {
  columns: Record<string, number | undefined>;
  headerRecognized: boolean;
} {
  const normalized = header.map(normalizeHeader);
  const columns: Record<string, number | undefined> = {};
  let hits = 0;

  for (const [field, aliases] of Object.entries(MAPPING_COLUMN_ALIASES)) {
    const index = normalized.findIndex(cell => cell && aliases.includes(cell));
    if (index >= 0) {
      columns[field] = index;
      hits += 1;
    } else {
      columns[field] = undefined;
    }
  }

  if (hits === 0) {
    // 表头没一个认得的（老文件、或者用户第一行就是数据），按固定位置读
    return { columns: { ...FALLBACK_POSITIONS }, headerRecognized: false };
  }
  return { columns, headerRecognized: true };
}

export interface ParseMappingResult {
  rows: ProductMappingFormData[];
  /** 被丢掉的行数（缺商品码，或者名字全空） */
  skipped: number;
  /** 表头是否认得出来（false 表示走了固定位置读法） */
  headerRecognized: boolean;
}

/**
 * 这一行是不是又一次出现的表头。
 *
 * 实测踩到过（2026-09-16，客户那份商品清单）：文件第 1、2 行都是
 * `商品ID/商品名/金蝶代码/规格/箱规/商品大类`——手工维护的表里这很常见
 * （冻结窗格、复制整行都会留下第二份表头）。不识别的话它会被当成一条映射导进去，
 * 商品码变成「商品ID」四个字，然后在派单表里凭空多出一行。
 *
 * 判据要严：**表头里有值的每一列，这一行的同一列都得跟它一样**才算重复。
 * 只比一列的话，真实数据里恰好同名（比如某个商品就叫「规格」）会被误杀。
 *
 * 和桌面端 app/task/mapping_reader.py 的 `_is_repeated_header` 是同一条规则，
 * 改一边要改另一边。
 */
function isRepeatedHeader(row: string[], header: string[]): boolean {
  let compared = 0;
  for (let idx = 0; idx < header.length; idx += 1) {
    const headerCell = normalizeHeader(header[idx]);
    if (!headerCell || idx >= row.length) continue;
    if (normalizeHeader(row[idx]) !== headerCell) return false;
    compared += 1;
  }
  return compared > 0;
}

/**
 * 解析上传的 xlsx。
 *
 * 与桌面端一致的取舍：
 * - productId 必填（它是 upsert 的唯一键），缺了就丢这一行
 * - 三个名字（派单名 / 多多名 / 金蝶代码）全空也丢，这种行没有意义
 * - 认不出任何表头 → 按 A/B/C/D 固定位置读（老清单能用）
 * - 重复出现的表头行跳过（不当数据）
 *
 * 是异步的：exceljs 的 xlsx.load 只能异步调用。
 */
export async function parseMappingWorkbook(buffer: Buffer): Promise<ParseMappingResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], skipped: 0, headerRecognized: false };
  }

  const matrix = sheetToMatrix(worksheet);
  if (matrix.length === 0) {
    return { rows: [], skipped: 0, headerRecognized: false };
  }

  const [header, ...dataRows] = matrix;
  const { columns, headerRecognized } = resolveColumns(header);

  const pick = (row: string[], field: string): string => {
    const index = columns[field];
    if (index === undefined || index < 0 || index >= row.length) return '';
    return (row[index] || '').trim();
  };

  const rows: ProductMappingFormData[] = [];
  let skipped = 0;
  let repeatedHeaderSeen = false;

  for (const row of dataRows) {
    if (isRepeatedHeader(row, header)) {
      // 只提示一次，不刷屏
      if (!repeatedHeaderSeen) {
        repeatedHeaderSeen = true;
        console.log('[console/mappings/import] 文件里有重复出现的表头行，已跳过（手工表常见，不当数据）');
      }
      skipped += 1;
      continue;
    }

    const productId = pick(row, 'productId');
    const dispatchName = pick(row, 'dispatchName');
    const pddName = pick(row, 'pddName');
    const listCode = pick(row, 'listCode');

    if (!productId || !(dispatchName || pddName || listCode)) {
      skipped += 1;
      continue;
    }

    rows.push({
      productId,
      pddName,
      dispatchName,
      spec: pick(row, 'spec'),
      listCode,
      boxSpec: pick(row, 'boxSpec'),
      category: pick(row, 'category'),
    });
  }

  return { rows, skipped, headerRecognized };
}

/** 导出成 xlsx（对外的备份/交付用；现在用的是标准表头名）。 */
export async function buildMappingWorkbook(rows: ProductMapping[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('商品映射表');

  worksheet.addRow(MAPPING_EXPORT_HEADERS.map(h => h.title));
  worksheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    worksheet.addRow(MAPPING_EXPORT_HEADERS.map(h => (row as unknown as Record<string, string>)[h.key] || ''));
  }

  worksheet.columns.forEach((column, index) => {
    const title = MAPPING_EXPORT_HEADERS[index]?.title || '';
    // 商品名那一列给宽一点，其余按表头长度估
    column.width = title === '派单表商品名称' || title === '多多商品名称' ? 42 : Math.max(title.length * 2 + 4, 12);
  });

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

/** 空模板（只有表头 + 一行示例），让用户对齐列名后再填。 */
export async function buildMappingTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('商品映射表');

  worksheet.addRow(MAPPING_EXPORT_HEADERS.map(h => h.title));
  worksheet.getRow(1).font = { bold: true };

  worksheet.addRow([
    '示例：心相印卷纸10卷',      // 派单表商品名称
    '心相印卷纸（10卷装）',      // 多多商品名称
    '567251000000',              // productId
    '10卷/提',                   // 规格
    'FMS.JZ.6926706200114',      // 金蝶代码
    '6',                         // 箱规
    '纸品',                      // 商品大类
  ]);
  worksheet.getRow(2).font = { color: { argb: 'FF999999' } };

  const widths = [42, 42, 18, 14, 26, 10, 14];
  worksheet.columns.forEach((column, index) => {
    column.width = widths[index] || 16;
  });

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
