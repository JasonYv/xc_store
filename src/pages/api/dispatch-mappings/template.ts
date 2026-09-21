import type { NextApiRequest, NextApiResponse } from 'next';
import { CLOUD_MAPPING_FORMAT, handleMappingTemplate } from '@/lib/mapping-api';

// 云仓派单映射表：下载空模板。
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleMappingTemplate(req, res, 'dispatch-mappings/template', CLOUD_MAPPING_FORMAT);
}
