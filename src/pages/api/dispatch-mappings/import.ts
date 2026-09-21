import type { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';
import { CLOUD_MAPPING_TENANT_ID, handleMappingImport } from '@/lib/mapping-api';

// 云仓派单映射表：xlsx 导入（按商品码 upsert）。
// Next 只认字面量的 config（从别处 import 过来会被忽略，bodyParser 仍然开着，
// multipart 会被吃掉导致导入失败），所以每个导入路由都得原样写一份。
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await db.init();
  return handleMappingImport(req, res, CLOUD_MAPPING_TENANT_ID, '云仓派单映射表', 'dispatch-mappings/import');
}
