import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { Merchant } from '@/lib/types';
import { enqueue } from '@/lib/screenshot-request-cache';

// WorkTool 机器人消息回调。群里发「机器人发图」→ 记录该群所属商家的发图请求。
// 契约：https://doc.worktool.ymdyes.cn/doc-861677
// - 必须返回 { code: 0, message: 'success' }；不支持在响应内下发指令。

const TRIGGER_KEYWORD = '机器人发图';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ code: 1, message: 'Method Not Allowed' });
  }

  // 鉴权：URL token（WorkTool 回调不会带 x-api-key）
  const token = req.query.token;
  const expected = process.env.WORKTOOL_CALLBACK_TOKEN;
  if (!expected || token !== expected) {
    return res.status(401).json({ code: 1, message: 'invalid token' });
  }

  try {
    const body = req.body || {};
    const roomType = Number(body.roomType);
    const textType = Number(body.textType);
    const spoken = String(body.spoken ?? '').trim();
    const groupName = String(body.groupName ?? '').trim();

    // 过滤：仅群(1/3) + 文本(1) + 精确触发词 + 群名非空
    // 群名为空则忽略：避免空字符串误匹配到 groupName 未配置(同为空)的商家
    const isGroup = roomType === 1 || roomType === 3;
    if (!isGroup || textType !== 1 || spoken !== TRIGGER_KEYWORD || !groupName) {
      return res.status(200).json({ code: 0, message: 'success' });
    }

    // 匹配商家：一个群可能对应多个账号，全部入队（各截一张图发到该群）
    await db.init();
    const merchants = await db.getAllMerchants();
    const matched = merchants.filter((m: Merchant) => m.groupName === groupName);

    if (matched.length === 0) {
      console.warn(`[worktool-callback] 未匹配到商家，群名: ${groupName}`);
      return res.status(200).json({ code: 0, message: 'success' });
    }

    const results = matched.map((m) => ({ name: m.name, result: enqueue(m) }));
    const enqueued = results.filter((r) => r.result === 'enqueued').map((r) => r.name);
    const skipped = results.filter((r) => r.result !== 'enqueued').map((r) => r.name);
    if (enqueued.length > 0) {
      console.log(`[worktool-callback] 已入队 ${enqueued.length} 个商家发图请求：群 ${groupName}（${enqueued.join('、')}）`);
    }
    if (skipped.length > 0) {
      // 冷却中/在途重复 → 忽略，防止 WorkTool 回调重放/连发导致重复截图
      console.log(`[worktool-callback] 忽略 ${skipped.length} 个重复/冷却中的发图请求：群 ${groupName}（${skipped.join('、')}）`);
    }
    return res.status(200).json({ code: 0, message: 'success' });
  } catch (error) {
    console.error('[worktool-callback] 处理回调出错:', error);
    // 仍返回成功，避免 WorkTool 重试风暴；错误已记日志
    return res.status(200).json({ code: 0, message: 'success' });
  }
}
