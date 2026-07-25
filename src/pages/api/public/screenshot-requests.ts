import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { claimPending, complete, completeByGroup } from '@/lib/screenshot-request-cache';

// 采集端接口：
// GET  拉取待发图请求（pending → processing）
// POST 回报发送完成（按 groupName 移除）
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  try {
    await db.init();

    // API Key 校验（沿用现有 public 范式）
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const systemApiKey = await db.getSetting('apiKey');
    if (!apiKey || !systemApiKey || apiKey !== systemApiKey) {
      return res.status(401).json({ success: false, error: '无效的API密钥' });
    }

    if (req.method === 'GET') {
      const data = claimPending();
      return res.status(200).json({ success: true, data, total: data.length });
    }

    // POST：回报完成。优先按 merchantId（新采集端）；
    // 兼容旧采集端按 groupName 回报 → 移除该群下所有请求。
    const merchantId = String(req.body?.merchantId ?? '').trim();
    const groupName = String(req.body?.groupName ?? '').trim();
    if (merchantId) {
      const removed = complete(merchantId);
      return res.status(200).json({ success: true, removed });
    }
    if (groupName) {
      const removedCount = completeByGroup(groupName);
      return res.status(200).json({ success: true, removed: removedCount > 0, removedCount });
    }
    return res.status(400).json({ success: false, error: '缺少 merchantId 或 groupName' });
  } catch (error) {
    console.error('[screenshot-requests] 处理出错:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}
