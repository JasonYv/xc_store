import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import path from 'path';
import fs from 'fs';
import db from '@/lib/sqlite-db';

// 禁用Next.js默认的body解析,使用formidable处理
export const config = {
  api: {
    bodyParser: false,
  },
};

// WorkTool机器人配置
const WORKTOOL_API_URL = 'https://api.worktool.ymdyes.cn/wework/sendRawMessage';
const ROBOT_ID = 'wtr89taerr32z8miwin31fabnzdkzn83';

// 辅助函数：安全提取字段值
function extractFieldValue(field: string | string[] | undefined): string | undefined {
  if (!field) return undefined;
  if (Array.isArray(field)) {
    return field[0] || undefined;
  }
  return field;
}

// 辅助函数：安全提取文件对象
function extractFile(file: File | File[] | undefined): File | undefined {
  if (!file) return undefined;
  if (Array.isArray(file)) {
    return file[0] || undefined;
  }
  return file;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  await db.migrateFromJson();

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '仅支持 POST 请求'
    });
  }

  let tempFilePath: string | null = null;

  try {
    // 使用临时目录先保存文件
    const tempUploadDir = path.join(process.cwd(), 'public/uploads/order-screenshots', 'temp');

    // 确保临时目录存在
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }

    // 配置formidable
    const form = formidable({
      uploadDir: tempUploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: false,
      filename: (_name, ext) => {
        // 生成唯一文件名
        return `temp_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
      }
    });

    // 解析表单数据
    const parseForm = (): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
      return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) {
            reject(err);
          } else {
            resolve({ fields, files });
          }
        });
      });
    };

    const { fields, files } = await parseForm();

    // 提取商家ID（同时支持 merchantId 和 merchant_id）
    // 先从 fields 中提取
    let merchantId = extractFieldValue(fields.merchantId) || extractFieldValue(fields.merchant_id);

    // 如果 fields 中没有，尝试从 files 中读取（有些客户端会把文本字段也放在 files 中）
    if (!merchantId) {
      const merchantIdFile = extractFile(files.merchantId) || extractFile(files.merchant_id);
      if (merchantIdFile && merchantIdFile.mimetype?.includes('text')) {
        // 读取文件内容作为 merchantId
        try {
          merchantId = fs.readFileSync(merchantIdFile.filepath, 'utf-8').trim();
          // 删除临时文件
          fs.unlinkSync(merchantIdFile.filepath);
        } catch (err) {
          console.error('读取 merchantId 文件失败:', err);
        }
      }
    }

    // 验证商家ID
    if (!merchantId || merchantId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '缺少或无效的商家ID参数 (merchantId 或 merchant_id)',
        debug: {
          receivedFieldNames: Object.keys(fields),
          merchantIdRaw: fields.merchantId,
          merchant_idRaw: fields.merchant_id,
          merchantIdExtracted: merchantId
        }
      });
    }

    // 提取文件
    const uploadedFile = extractFile(files.screenshot);

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: '缺少截图文件 (screenshot)',
        debug: {
          receivedFileNames: Object.keys(files)
        }
      });
    }

    // 保存临时文件路径，用于错误时清理
    tempFilePath = uploadedFile.filepath;

    // 查询商家信息
    const merchant = await db.getMerchantById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: `商家不存在 (ID: ${merchantId})`
      });
    }

    // 检查商家是否启用了发送订单截图
    if (!merchant.sendOrderScreenshot) {
      return res.status(400).json({
        success: false,
        message: `商家 "${merchant.name}" 未启用发送订单截图功能`
      });
    }

    // 生成目录和文件名: 商家ID/yyyyMMdd/HHmm.jpg
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const dateFolder = `${year}${month}${day}`; // yyyyMMdd
    const fileName = `${hours}${minutes}.jpg`; // HHmm.jpg

    // 创建商家目录和日期目录
    const merchantFolder = path.join(process.cwd(), 'public/uploads/order-screenshots', merchantId);
    const dateFolderPath = path.join(merchantFolder, dateFolder);

    if (!fs.existsSync(merchantFolder)) {
      fs.mkdirSync(merchantFolder, { recursive: true });
    }
    if (!fs.existsSync(dateFolderPath)) {
      fs.mkdirSync(dateFolderPath, { recursive: true });
    }

    // 移动文件到目标位置
    const targetFilePath = path.join(dateFolderPath, fileName);

    // 如果目标文件已存在，删除它
    if (fs.existsSync(targetFilePath)) {
      fs.unlinkSync(targetFilePath);
    }

    fs.renameSync(uploadedFile.filepath, targetFilePath);
    tempFilePath = null; // 文件已成功移动，清空临时路径

    // 生成可访问的图片URL: /uploads/order-screenshots/商家ID/yyyyMMdd/HHmm.jpg
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const relativePath = `${merchantId}/${dateFolder}/${fileName}`;
    const imageUrl = `${baseUrl}/uploads/order-screenshots/${relativePath}`;

    // 调用WorkTool机器人发送图片
    const robotPayload = {
      socketType: 2,
      list: [
        {
          type: 218,
          titleList: [merchant.groupName],
          objectName: uploadedFile.originalFilename || fileName,
          fileUrl: imageUrl,
          fileType: 'image',
          // extraText: `${merchant.name} - 订单截图`
        }
      ]
    };

    const robotResponse = await fetch(`${WORKTOOL_API_URL}?robotId=${ROBOT_ID}&t=${Date.now()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(robotPayload)
    });

    const robotResult = await robotResponse.json();

    // 检查机器人响应
    if (!robotResponse.ok || robotResult.code !== 200) {
      console.error('WorkTool机器人发送失败:', robotResult);
      return res.status(500).json({
        success: false,
        message: '发送消息到企业微信失败',
        error: robotResult.message || '未知错误',
        imageUrl // 即使发送失败也返回图片URL
      });
    }

    return res.status(200).json({
      success: true,
      message: '订单截图已成功发送',
      data: {
        merchantId: merchant.id,
        merchantName: merchant.name,
        groupName: merchant.groupName,
        imageUrl,
        fileName: relativePath, // 返回相对路径: 商家ID/yyyyMMdd/HHmm.jpg
        robotResponse: robotResult
      }
    });

  } catch (error) {
    console.error('处理订单截图上传失败:', error);

    // 清理临时文件
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError);
      }
    }

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误',
      error: error instanceof Error ? error.stack : String(error)
    });
  }
}
