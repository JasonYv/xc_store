import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import db from '@/lib/sqlite-db';
import { requireTenant } from '@/lib/tenant-auth';
import { parseMappingWorkbook } from '@/lib/mapping-xlsx';

// 从 xlsx 批量导入商品映射表。
//
// 语义是**按商品码 upsert**，不是整表替换：导入一份清单不应该影响清单里没提到的
// 商品（运营常常只发变化的那几个）。要清空请走界面上的「清空」。
//
// 解析表单沿用项目里已有的写法（v3/send-order-screenshot 那套）：Next 默认的
// bodyParser 处理不了 multipart，所以关掉它、用 formidable 落临时目录再读。

export const config = {
  api: {
    bodyParser: false,
  },
};

/** 单文件上限：映射表是纯文本表格，20MB 足够（几万行也就几 MB）。 */
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const TEMP_DIR = path.join(process.cwd(), 'public', 'uploads', 'mapping-import-temp');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const ctx = await requireTenant(req, res);
  if (!ctx) return;

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
    const parsed = await parseMappingWorkbook(buffer);

    if (parsed.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: parsed.skipped > 0
          ? `文件里 ${parsed.skipped} 行都被跳过了（缺商品码，或商品名全空），没有可导入的数据`
          : '文件里没有数据行（第一行按表头处理）',
      });
    }

    const result = await db.upsertProductMappings(ctx.tenantId, parsed.rows);
    const version = await db.getProductMappingsVersion(ctx.tenantId);

    console.log(
      `[console/mappings/import] 租户 ${ctx.tenantName} 导入完成：`
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
    console.error('[console/mappings/import] 出错:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    // 文件读不动 / 不是合法 xlsx 是用户可修复的问题，给 400 而不是 500
    const isUserError = /zip|not a valid|corrupt|Unsupported|central directory|File size/i.test(message);
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
        console.warn('[console/mappings/import] 删除临时文件失败:', cleanupError);
      }
    }
  }
}
