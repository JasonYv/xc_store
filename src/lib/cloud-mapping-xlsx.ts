import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import type { ProductMapping, ProductMappingFormData } from '@/lib/types';

// 云仓版派单映射表的 Excel 读写。
//
// 云仓的表和商家版不是一个格式（2026-09-21 对着实际在用的「2026年商品映射表.xls」核对）：
//
//   | A（表头空着） | B 多多商品名称 | C ID      | D 规格 | E（A 的副本） |
//   | 洗脸巾80片    | 【商超同款】…  | 566197561356 | 80抽/包 | 洗脸巾80片 |
//
// - 是 .xls（老版 Excel），exceljs 读不了，所以读用 SheetJS（.xls/.xlsx 都认）
// - A 列表头是空的、C 列叫「ID」，按表头名认列会整张认不出来
// 所以这里**不看表头、按位置读**，规则逐条照抄云仓版采集端
// `app/task/mapping_reader.py` 的 `_parse_row`：跳过第 1 行，A 派单名 / B 多多名 /
// C 商品 ID / D 规格，A 和 C 都有值才收，E 列不读。两边规则不一致的话，后台导得进、
// 桌面端却读不出（或反过来），改一边要改另一边。

/** 导出/模板的表头。列位置才是契约，表头只给人看；A 列原表是空的，这里写上名字方便认。 */
export const CLOUD_MAPPING_HEADERS = ['派单表商品名称', '多多商品名称', 'ID', '规格'];

const CLOUD_FIELDS: (keyof ProductMappingFormData)[] = ['dispatchName', 'pddName', 'productId', 'spec'];

// xls 里数值型 ID 可能存成浮点或科学计数法（5.67251E+11），直接转字符串就对不上了
const SCIENTIFIC = /^\d+(\.\d+)?[eE][+-]?\d+$/;

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    return String(value);
  }
  const text = String(value).trim();
  if (SCIENTIFIC.test(text)) {
    const num = Number(text);
    if (Number.isFinite(num) && Number.isInteger(num)) return BigInt(Math.round(num)).toString();
  }
  // 纯数字被读成 "1001.0"
  if (/^\d+\.0+$/.test(text)) return text.replace(/\.0+$/, '');
  return text;
}

export interface ParseCloudMappingResult {
  rows: ProductMappingFormData[];
  /** 丢掉的非空行数（缺派单名或缺 ID）；整行空白的不算 */
  skipped: number;
}

/** 解析上传的 .xls / .xlsx（只读第一张工作表）。 */
export function parseCloudMappingFile(buffer: Buffer): ParseCloudMappingResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], skipped: 0 };

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  });

  const rows: ProductMappingFormData[] = [];
  let skipped = 0;

  // 第 1 行是表头，跳过（与桌面端一致）
  for (const raw of matrix.slice(1)) {
    const cells = [0, 1, 2, 3].map(index => cellText(raw[index]));
    if (cells.every(cell => !cell)) continue;

    const [dispatchName, pddName, productId, spec] = cells;
    if (!dispatchName || !productId) {
      skipped += 1;
      continue;
    }
    rows.push({ dispatchName, pddName, productId, spec, listCode: '', boxSpec: '', category: '' });
  }

  return { rows, skipped };
}

async function writeSheet(dataRows: string[][], greyFirstDataRow: boolean): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  worksheet.addRow(CLOUD_MAPPING_HEADERS);
  worksheet.getRow(1).font = { bold: true };
  for (const row of dataRows) worksheet.addRow(row);
  if (greyFirstDataRow && dataRows.length > 0) {
    worksheet.getRow(2).font = { color: { argb: 'FF999999' } };
  }

  // C 列（ID）按文本存：不然 Excel 打开后会变成 5.67E+11
  worksheet.getColumn(3).numFmt = '@';
  [30, 50, 18, 16].forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

/** 导出。列位置与原表一致，导出的文件可以直接当云仓版的本地映射表用。 */
export async function buildCloudMappingWorkbook(rows: ProductMapping[]): Promise<Buffer> {
  return writeSheet(rows.map(row => CLOUD_FIELDS.map(field => row[field] || '')), false);
}

/** 空模板：表头 + 一行灰色示例。 */
export async function buildCloudMappingTemplate(): Promise<Buffer> {
  return writeSheet([['洗脸巾80片', '【商超同款】心相印洗脸巾棉柔洁面80抽/包-替代毛巾', '566197561356', '80抽/包']], true);
}
