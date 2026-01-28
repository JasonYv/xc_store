import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { ApiResponse } from '@/lib/types';

interface CheckDuplicatesRequest {
  items: {
    merchantName: string;
    productName: string;
    deliveryDate: string;
  }[];
}

interface CheckDuplicatesResponse {
  duplicateKeys: string[]; // 格式: "merchantName|productName|deliveryDate"
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<CheckDuplicatesResponse | null>>
) {
  // 初始化数据库
  await db.init();

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      data: null,
      error: `Method ${req.method} Not Allowed`
    });
  }

  try {
    const { items } = req.body as CheckDuplicatesRequest;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        error: '缺少待检查的数据'
      });
    }

    // 批量检查重复
    const existingKeys = await db.checkDailyDeliveriesExist(items);

    // 找出已存在的记录
    const duplicateKeys: string[] = [];
    for (const item of items) {
      const key = `${item.merchantName}|${item.productName}|${item.deliveryDate}`;
      if (existingKeys.has(key)) {
        duplicateKeys.push(key);
      }
    }

    return res.status(200).json({
      success: true,
      data: { duplicateKeys }
    });
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      error: error.message || '服务器内部错误'
    });
  }
}
