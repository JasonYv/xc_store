import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

// 桌面端（商家版）拉远程配置的入口。
//
//   GET /api/ys/{token}
//
// token 就是 tenants.token——一个租户一个，桌面上填在「远程映射表地址」里。
// 这是**机器对机器**接口：没有登录态，token 本身即凭据。
//
// 几个刻意的选择：
// - 租户不存在 → 404、租户停用 → 403，但**不回显任何内部信息**（不告诉对方
//   「这个 token 格式对但不存在」和「不存在」的区别之外的东西），避免被枚举
// - 每次调用留一条访问日志（租户 + IP + UA）：出问题时能查「谁在什么时候拉过」
// - 路径 token 之外也接受 Authorization: Bearer，方便走代理/网关时把凭据从 URL 挪走

/** 令牌格式：ys_ + 48 位十六进制。格式不对直接 404，不必查库。 */
const TOKEN_PATTERN = /^ys_[0-9a-f]{48}$/;

function extractToken(req: NextApiRequest): string {
  const fromQuery = String(req.query.token || '').trim();
  if (fromQuery) return fromQuery;

  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return '';
}

function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    // nginx 反代后拿到的是一串，第一个才是真实客户端
    return forwarded.split(',')[0].trim();
  }
  return (req.socket?.remoteAddress || '').replace(/^::ffff:/, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const token = extractToken(req);
  if (!token || !TOKEN_PATTERN.test(token)) {
    return res.status(404).json({ success: false, error: 'not found' });
  }

  try {
    await db.init();

    const tenant = await db.getTenantByToken(token);
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'not found' });
    }
    if (!tenant.status) {
      return res.status(403).json({ success: false, error: '该租户已停用，请联系服务方' });
    }

    const rows = await db.getAllProductMappings(tenant.id);
    const version = await db.getProductMappingsVersion(tenant.id);

    console.log(
      `[ys] 远程配置拉取：租户=${tenant.name}(${tenant.id}) 行数=${rows.length} `
      + `IP=${clientIp(req)} UA=${String(req.headers['user-agent'] || '').slice(0, 80)}`
    );

    return res.status(200).json({
      success: true,
      data: {
        tenant: { name: tenant.name },
        // 映射表最后修改时间。桌面端可用来判断「有没有变」，也可以只做展示
        version,
        mapping: {
          // 列名固定列出，桌面端不用靠猜；顺序与导出 xlsx 一致
          columns: ['productId', 'pddName', 'dispatchName', 'spec', 'listCode', 'boxSpec', 'category'],
          rows: rows.map(row => ({
            productId: row.productId,
            pddName: row.pddName,
            dispatchName: row.dispatchName,
            spec: row.spec,
            listCode: row.listCode,
            boxSpec: row.boxSpec,
            category: row.category,
          })),
        },
      },
    });
  } catch (error) {
    console.error('[ys] 拉取远程配置出错:', error);
    return res.status(500).json({ success: false, error: '服务器内部错误' });
  }
}
