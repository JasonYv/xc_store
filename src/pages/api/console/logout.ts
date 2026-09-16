import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { clearSessionCookie, readSessionCookie } from '@/lib/tenant-auth';

// 退出：删掉服务端会话记录 + 清 cookie。
// 只清 cookie 是不够的——会话记录还在库里，别人捡到旧 token 仍然能用。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  try {
    await db.init();
    const token = readSessionCookie(req);
    if (token) {
      await db.deleteTenantSession(token);
    }
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[console/logout] 出错:', error);
    // 退出失败也要把 cookie 清掉，别让用户卡在「点了没反应」
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  }
}
