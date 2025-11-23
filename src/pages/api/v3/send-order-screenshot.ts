import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import path from 'path';
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  await db.migrateFromJson();

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '仅支持 POST 请求'
    });
  }

  try {
    // 使用临时目录先保存文件
    const fs = require('fs');
    const tempUploadDir = path.join(process.cwd(), 'public/uploads/order-screenshots', 'temp');

    // 确保临时目录存在
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }

    // 解析表单
    const form = formidable({
      uploadDir: tempUploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      }
    );

    // 获取商家ID
    const merchantId = Array.isArray(fields.merchantId)
      ? fields.merchantId[0]
      : fields.merchantId;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: '缺少商家ID参数'
      });
    }

    // 获取上传的文件
    const uploadedFile = files.screenshot;
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: '缺少截图文件'
      });
    }

    const tempFile: File = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;

    // 查询商家信息
    const merchant = await db.getMerchantById(merchantId);
    if (!merchant) {
      // 删除临时文件
      fs.unlinkSync(tempFile.filepath);
      return res.status(404).json({
        success: false,
        message: '商家不存在'
      });
    }

    // 检查商家是否启用了发送订单截图
    if (!merchant.sendOrderScreenshot) {
      // 删除临时文件
      fs.unlinkSync(tempFile.filepath);
      return res.status(400).json({
        success: false,
        message: '该商家未启用发送订单截图功能'
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
    fs.renameSync(tempFile.filepath, targetFilePath);

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
          objectName: tempFile.originalFilename || fileName,
          fileUrl: imageUrl,
          fileType: 'image',
          extraText: `${merchant.name} - 订单截图`
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
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
}
