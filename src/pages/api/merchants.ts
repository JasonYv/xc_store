import { NextApiRequest, NextApiResponse } from 'next';
import { Merchant } from '@/lib/types';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, query } = req;

    // 初始化数据库并迁移数据
    await db.init();
    await db.migrateFromJson();

    switch (method) {
      case 'GET':
        const page = Number(query.page) || 1;
        const pageSize = Number(query.pageSize) || 10;
        const orderBy = query.orderBy?.toString();
        const orderDirection = (query.orderDirection?.toString().toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';

        // 提取搜索过滤参数
        const filters = {
          name: query.name?.toString(),
          merchantId: query.merchantId?.toString(),
          pinduoduoName: query.pinduoduoName?.toString(),
          warehouse1: query.warehouse1?.toString(),
          groupName: query.groupName?.toString(),
          sendMessage: query.sendMessage?.toString() as 'true' | 'false' | undefined
        };

        const paginatedResult = await db.getMerchantsPaginated(
          page,
          pageSize,
          filters,
          orderBy,
          orderDirection
        );
        return res.status(200).json(paginatedResult);

      case 'POST':
        const newMerchant = await db.insertMerchant({
          name: req.body.name,
          merchantId: req.body.merchantId,
          pinduoduoName: req.body.pinduoduoName,
          warehouse1: req.body.warehouse1,
          groupName: req.body.groupName,
          sendMessage: req.body.sendMessage,
          sendOrderScreenshot: req.body.sendOrderScreenshot || false,
          mentionList: req.body.mentionList,
          subAccount: req.body.subAccount || '',
          pinduoduoPassword: req.body.pinduoduoPassword || '',
          cookie: req.body.cookie || '',
          pinduoduoShopId: req.body.pinduoduoShopId || ''
        });
        return res.status(201).json(newMerchant);

      case 'PUT':
        const { id } = query;
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Invalid merchant ID' });
        }

        const updatedMerchant = await db.updateMerchant(id, req.body);
        
        if (!updatedMerchant) {
          return res.status(404).json({ error: 'Merchant not found' });
        }

        return res.status(200).json(updatedMerchant);

      case 'DELETE':
        const deleteId = query.id;
        if (!deleteId || typeof deleteId !== 'string') {
          return res.status(400).json({ error: 'Invalid merchant ID' });
        }

        const deleted = await db.deleteMerchant(deleteId);
        
        if (!deleted) {
          return res.status(404).json({ error: 'Merchant not found' });
        }

        return res.status(200).json({ message: 'Merchant deleted' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 