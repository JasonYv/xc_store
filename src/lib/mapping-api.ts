import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import db from '@/lib/sqlite-db';
import { buildMappingTemplate, buildMappingWorkbook, parseMappingWorkbook } from '@/lib/mapping-xlsx';
import {
  buildCloudMappingTemplate,
  buildCloudMappingWorkbook,
  parseCloudMappingFile,
} from '@/lib/cloud-mapping-xlsx';
import type { ProductMapping, ProductMappingFormData } from '@/lib/types';

// 商品映射表接口的处理逻辑，两个入口共用：
//   - 租户控制台 /api/console/mappings*（tenantId 来自会话）
//   - 云仓内部后台 /api/dispatch-mappings*（tenantId 固定为 CLOUD_MAPPING_TENANT_ID）
//
// 为什么抽出来：两边的规则（商品码唯一、导入按商品码 upsert、导出能原样往返）必须
// 完全一致，各写一份迟早一边修了另一边没修。入口文件只负责「这次操作的是哪个
// tenantId」，其余都在这里。

/**
 * 云仓自用映射表的 tenantId。
 *
 * 刻意**不是** tenants 表里的一行：没有令牌、没有控制台账号，所以 /api/ys/{token}
 * 和 /console 都够不到它；桌面端（云仓版）走 API Key 的 /api/public/dispatch-mapping 拉。
 * 租户 id 是 Date.now()+随机串生成的，不会撞上这个带下划线的值。
 */
export const CLOUD_MAPPING_TENANT_ID = '__cloud_warehouse__';

/**
 * 映射表的 Excel 格式与必填规则。两边的表不是一个格式（见 lib/cloud-mapping-xlsx.ts）：
 * - TENANT：商家版清单，按表头名认列，7 列，只收 .xlsx
 * - CLOUD：云仓版原表，按 A–D 位置读，4 列，.xls/.xlsx 都收；派单名必填
 *   （云仓版采集端读的时候没有派单名的行会被丢掉，后台不能让这种行存进去）
 */
export interface MappingFormat {
  parse: (buffer: Buffer) => Promise<{ rows: ProductMappingFormData[]; skipped: number; headerRecognized: boolean }>;
  buildWorkbook: (rows: ProductMapping[]) => Promise<Buffer>;
  buildTemplate: () => Promise<Buffer>;
  requireDispatchName: boolean;
}

export const TENANT_MAPPING_FORMAT: MappingFormat = {
  parse: parseMappingWorkbook,
  buildWorkbook: buildMappingWorkbook,
  buildTemplate: buildMappingTemplate,
  requireDispatchName: false,
};

export const CLOUD_MAPPING_FORMAT: MappingFormat = {
  // 按位置读，没有「表头认没认出来」这回事，固定报 true，界面不会误提示
  parse: async buffer => ({ ...parseCloudMappingFile(buffer), headerRecognized: true }),
  buildWorkbook: buildCloudMappingWorkbook,
  buildTemplate: buildCloudMappingTemplate,
  requireDispatchName: true,
};

const MAX_PAGE_SIZE = 200;
/** 单文件上限：映射表是纯文本表格，20MB 足够（几万行也就几 MB）。 */
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const TEMP_DIR = path.join(process.cwd(), 'public', 'uploads', 'mapping-import-temp');

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** 桌面端拉取时的行结构。字段名与桌面端 mapping_reader 对齐，远程与本地读出同一份东西。 */
export const MAPPING_COLUMNS = ['productId', 'pddName', 'dispatchName', 'spec', 'listCode', 'boxSpec', 'category'];

export function toMappingRow(row: ProductMapping) {
  return {
    productId: row.productId,
    pddName: row.pddName,
    dispatchName: row.dispatchName,
    spec: row.spec,
    listCode: row.listCode,
    boxSpec: row.boxSpec,
    category: row.category,
  };
}

function trimmed(value: unknown): string {
  return String(value ?? '').trim();
}

/** GET 分页搜索 / POST 新增 / PUT 修改 / DELETE 删除。所有读写都显式带 tenantId。 */
export async function handleMappingCrud(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  logTag: string,
  format: MappingFormat = TENANT_MAPPING_FORMAT
) {
  try {
    if (req.method === 'GET') {
      // 分页 + 关键字搜索。keyword 会同时搜商品名/派单名/商品码/金蝶代码
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const rawPageSize = parseInt(String(req.query.pageSize || '50'), 10) || 50;
      const pageSize = Math.min(Math.max(1, rawPageSize), MAX_PAGE_SIZE);
      const keyword = trimmed(req.query.keyword);

      const result = await db.getProductMappingsPaginated(
        tenantId, page, pageSize, keyword || undefined
      );
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const productId = trimmed(body.productId);
      if (!productId) {
        // productId 是 upsert 的唯一键，没有它这行存不住也匹配不上
        return res.status(400).json({ success: false, error: '商品码(productId)不能为空' });
      }
      if (format.requireDispatchName && !trimmed(body.dispatchName)) {
        return res.status(400).json({ success: false, error: '派单表商品名称不能为空' });
      }

      const duplicated = await db.getProductMappingByProductId(tenantId, productId);
      if (duplicated) {
        return res.status(409).json({
          success: false,
          error: `商品码 ${productId} 已存在，请直接编辑那一行`,
        });
      }

      const created = await db.insertProductMapping(tenantId, {
        productId,
        pddName: trimmed(body.pddName),
        dispatchName: trimmed(body.dispatchName),
        spec: trimmed(body.spec),
        listCode: trimmed(body.listCode),
        boxSpec: trimmed(body.boxSpec),
        category: trimmed(body.category),
      });
      return res.status(200).json({ success: true, data: created });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = trimmed(body.id);
      if (!id) {
        return res.status(400).json({ success: false, error: '缺少 id' });
      }
      // 改商品码时要防撞：改成另一个已存在的商品码会让 upsert 语义变乱
      if (body.productId !== undefined) {
        const nextProductId = trimmed(body.productId);
        if (!nextProductId) {
          return res.status(400).json({ success: false, error: '商品码(productId)不能为空' });
        }
        const owner = await db.getProductMappingByProductId(tenantId, nextProductId);
        if (owner && owner.id !== id) {
          return res.status(409).json({
            success: false,
            error: `商品码 ${nextProductId} 已被另一行使用`,
          });
        }
      }

      if (format.requireDispatchName && body.dispatchName !== undefined && !trimmed(body.dispatchName)) {
        return res.status(400).json({ success: false, error: '派单表商品名称不能为空' });
      }

      const fields = ['productId', 'pddName', 'dispatchName', 'spec', 'listCode', 'boxSpec', 'category'] as const;
      const patch: Partial<ProductMappingFormData> = {};
      for (const field of fields) {
        if (body[field] !== undefined) patch[field] = trimmed(body[field]);
      }

      const updated = await db.updateProductMapping(id, tenantId, patch);
      if (!updated) {
        return res.status(404).json({ success: false, error: '这一行不存在（或不属于当前租户）' });
      }
      return res.status(200).json({ success: true, data: updated });
    }

    if (req.method === 'DELETE') {
      const id = trimmed(req.query.id);
      if (!id) {
        return res.status(400).json({ success: false, error: '缺少 id' });
      }
      const removed = await db.deleteProductMapping(id, tenantId);
      if (!removed) {
        return res.status(404).json({ success: false, error: '这一行不存在（或不属于当前租户）' });
      }
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  } catch (error) {
    console.error(`[${logTag}] 出错:`, error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}

/**
 * 从 xlsx 批量导入。语义是**按商品码 upsert**，不是整表替换：导入一份清单不应该
 * 影响清单里没提到的商品（运营常常只发变化的那几个）。
 *
 * 解析表单沿用项目里已有的写法（v3/send-order-screenshot 那套）：用 formidable 落临时
 * 目录再读。**调用它的路由必须自己导出字面量 `config = { api: { bodyParser: false } }`**。
 */
export async function handleMappingImport(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  ownerLabel: string,
  logTag: string,
  format: MappingFormat = TENANT_MAPPING_FORMAT
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  let tempFilePath = '';

  try {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const form = formidable({
      uploadDir: TEMP_DIR,
      keepExtensions: true,
      maxFileSize: MAX_FILE_SIZE,
      multiples: false,
      filename: (_name, ext) => `mapping_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
    });

    const parsedForm = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve({ fields, files });
        });
      }
    );

    const pickFile = (value: formidable.File | formidable.File[] | undefined): formidable.File | undefined =>
      Array.isArray(value) ? value[0] : value;

    // 字段名固定叫 file；也接受 files（有些客户端习惯这么写）
    const uploaded = pickFile(parsedForm.files.file) || pickFile(parsedForm.files.files);
    if (!uploaded) {
      return res.status(400).json({ success: false, error: '没有收到文件（表单字段名应为 file）' });
    }
    tempFilePath = uploaded.filepath;

    const buffer = fs.readFileSync(tempFilePath);
    const parsed = await format.parse(buffer);

    if (parsed.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: parsed.skipped > 0
          ? `文件里 ${parsed.skipped} 行都被跳过了（${format.requireDispatchName ? '缺派单名或缺 ID' : '缺商品码，或商品名全空'}），没有可导入的数据`
          : '文件里没有数据行（第一行按表头处理）',
      });
    }

    const result = await db.upsertProductMappings(tenantId, parsed.rows);
    const version = await db.getProductMappingsVersion(tenantId);

    console.log(
      `[${logTag}] ${ownerLabel} 导入完成：`
      + `新增 ${result.inserted}、更新 ${result.updated}、跳过 ${result.skipped}`
      + `（表头${parsed.headerRecognized ? '已识别' : '未识别，按固定列位置读'}）`
    );

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        // 解析阶段丢掉的行（缺商品码等）和 upsert 阶段跳过的分开报，
        // 界面上要能说清「为什么文件里 100 行、只进来 97 行」
        parseSkipped: parsed.skipped,
        headerRecognized: parsed.headerRecognized,
        version,
      },
    });
  } catch (error) {
    console.error(`[${logTag}] 出错:`, error);
    const message = error instanceof Error ? error.message : '未知错误';
    // 文件读不动 / 不是合法 xlsx 是用户可修复的问题，给 400 而不是 500
    const isUserError = /zip|not a valid|corrupt|Unsupported|central directory|File size|Invalid|CFB|signature/i.test(message);
    return res.status(isUserError ? 400 : 500).json({
      success: false,
      error: isUserError ? `文件解析失败：${message}` : '服务器内部错误',
      message,
    });
  } finally {
    // 临时文件用完就删——解析出来的只是文本，没有留档的必要
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn(`[${logTag}] 删除临时文件失败:`, cleanupError);
      }
    }
  }
}

/**
 * 导出为 xlsx。表头用的是标准列名，且都在导入的别名表里，
 * 所以「导出 → 改 → 再导入」能原样往返。
 * fileLabel 进文件名（租户名 / 云仓），同时管几份表时不会混。
 */
export async function handleMappingExport(
  req: NextApiRequest,
  res: NextApiResponse,
  tenantId: string,
  fileLabel: string,
  logTag: string,
  format: MappingFormat = TENANT_MAPPING_FORMAT
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  try {
    const rows = await db.getAllProductMappings(tenantId);
    const buffer = await format.buildWorkbook(rows);

    const safeName = fileLabel.replace(/[\\/:*?"<>|]/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `${safeName}_商品映射表_${date}.xlsx`;

    res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mapping.xlsx"; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    console.error(`[${logTag}] 出错:`, error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}

/**
 * 下载空模板（表头 + 一行灰色示例）。导入是按表头名认列的，用户拿自己的表格来导
 * 经常因为列名不认识而整列丢失；给一份标准模板，照着填就不会错。
 */
export async function handleMappingTemplate(
  req: NextApiRequest,
  res: NextApiResponse,
  logTag: string,
  format: MappingFormat = TENANT_MAPPING_FORMAT
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  try {
    const buffer = await format.buildTemplate();
    res.setHeader('Content-Type', XLSX_CONTENT_TYPE);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mapping-template.xlsx"; filename*=UTF-8''${encodeURIComponent('商品映射表_模板.xlsx')}`
    );
    return res.status(200).send(buffer);
  } catch (error) {
    console.error(`[${logTag}] 出错:`, error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}
