import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { CLOUD_MAPPING_FORMAT, CLOUD_MAPPING_TENANT_ID, handleMappingExport } from '@/lib/mapping-api';

// 云仓派单映射表：导出 xlsx（A–D 与原表同位置，可以直接当云仓版的本地映射表用）。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  return handleMappingExport(req, res, CLOUD_MAPPING_TENANT_ID, '云仓派单', 'dispatch-mappings/export', CLOUD_MAPPING_FORMAT);
}
