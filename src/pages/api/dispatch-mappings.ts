import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { CLOUD_MAPPING_TENANT_ID, handleMappingCrud } from '@/lib/mapping-api';

// 云仓自用的派单表商品映射表（内部后台 /dashboard/dispatch-mappings 用）。
//
// 数据存在 product_mappings 表里，tenantId 固定为 CLOUD_MAPPING_TENANT_ID；
// 规则与租户控制台完全一致（lib/mapping-api.ts）。云仓版桌面端通过
// /api/public/dispatch-mapping（API Key）拉这份数据出派单表。
//
// 鉴权与其它内部 /api/* 一致（即没有服务端校验，见 CLAUDE.md「认证系统」）；
// 配了 TENANT_HOSTS 时租户域名下访问这里一律 404（middleware）。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  return handleMappingCrud(req, res, CLOUD_MAPPING_TENANT_ID, 'dispatch-mappings');
}
