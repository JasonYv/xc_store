import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { requireTenant } from '@/lib/tenant-auth';

// 商品映射表的增删改查（租户内）。
//
// 每个分支第一件事都是拿 ctx（含 tenantId），所有读写都带 tenantId——
// 多租户最容易出的错就是漏一个 where 导致串租户，所以这里不做「不传就查全部」
// 那种省事写法，宁可每次都显式写出来。

const MAX_PAGE_SIZE = 200;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ success: false, error: '不支持的请求方法' });
  }

  const ctx = await requireTenant(req, res);
  if (!ctx) return;

  try {
    if (req.method === 'GET') {
      // 分页 + 关键字搜索。keyword 会同时搜商品名/派单名/商品码/金蝶代码
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const rawPageSize = parseInt(String(req.query.pageSize || '50'), 10) || 50;
      const pageSize = Math.min(Math.max(1, rawPageSize), MAX_PAGE_SIZE);
      const keyword = String(req.query.keyword || '').trim();

      const result = await db.getProductMappingsPaginated(
        ctx.tenantId, page, pageSize, keyword || undefined
      );
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const productId = String(body.productId || '').trim();
      if (!productId) {
        // productId 是 upsert 的唯一键，没有它这行存不住也匹配不上
        return res.status(400).json({ success: false, error: '商品码(productId)不能为空' });
      }

      const duplicated = await db.getProductMappingByProductId(ctx.tenantId, productId);
      if (duplicated) {
        return res.status(409).json({
          success: false,
          error: `商品码 ${productId} 已存在，请直接编辑那一行`,
        });
      }

      const created = await db.insertProductMapping(ctx.tenantId, {
        productId,
        pddName: String(body.pddName || '').trim(),
        dispatchName: String(body.dispatchName || '').trim(),
        spec: String(body.spec || '').trim(),
        listCode: String(body.listCode || '').trim(),
        boxSpec: String(body.boxSpec || '').trim(),
        category: String(body.category || '').trim(),
      });
      return res.status(200).json({ success: true, data: created });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = String(body.id || '').trim();
      if (!id) {
        return res.status(400).json({ success: false, error: '缺少 id' });
      }
      // 改商品码时要防撞：改成另一个已存在的商品码会让 upsert 语义变乱
      if (body.productId !== undefined) {
        const nextProductId = String(body.productId || '').trim();
        if (!nextProductId) {
          return res.status(400).json({ success: false, error: '商品码(productId)不能为空' });
        }
        const owner = await db.getProductMappingByProductId(ctx.tenantId, nextProductId);
        if (owner && owner.id !== id) {
          return res.status(409).json({
            success: false,
            error: `商品码 ${nextProductId} 已被另一行使用`,
          });
        }
      }

      const updated = await db.updateProductMapping(id, ctx.tenantId, {
        ...(body.productId !== undefined ? { productId: String(body.productId).trim() } : {}),
        ...(body.pddName !== undefined ? { pddName: String(body.pddName || '').trim() } : {}),
        ...(body.dispatchName !== undefined ? { dispatchName: String(body.dispatchName || '').trim() } : {}),
        ...(body.spec !== undefined ? { spec: String(body.spec || '').trim() } : {}),
        ...(body.listCode !== undefined ? { listCode: String(body.listCode || '').trim() } : {}),
        ...(body.boxSpec !== undefined ? { boxSpec: String(body.boxSpec || '').trim() } : {}),
        ...(body.category !== undefined ? { category: String(body.category || '').trim() } : {}),
      });
      if (!updated) {
        return res.status(404).json({ success: false, error: '这一行不存在（或不属于当前租户）' });
      }
      return res.status(200).json({ success: true, data: updated });
    }

    // DELETE
    const id = String(req.query.id || '').trim();
    if (!id) {
      return res.status(400).json({ success: false, error: '缺少 id' });
    }
    const removed = await db.deleteProductMapping(id, ctx.tenantId);
    if (!removed) {
      return res.status(404).json({ success: false, error: '这一行不存在（或不属于当前租户）' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[console/mappings] 出错:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
}
