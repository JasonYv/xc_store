import { NextApiRequest, NextApiResponse } from 'next';
import { Product } from '@/lib/types';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, query } = req;

    // 初始化数据库
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
          productName: query.productName?.toString(),
          pinduoduoProductId: query.pinduoduoProductId?.toString(),
          pinduoduoProductName: query.pinduoduoProductName?.toString(),
          merchantId: query.merchantId?.toString()
        };

        const paginatedResult = await db.getProductsPaginated(
          page,
          pageSize,
          filters,
          orderBy,
          orderDirection
        );
        return res.status(200).json(paginatedResult);

      case 'POST':
        const newProduct = await db.insertProduct({
          pinduoduoProductId: req.body.pinduoduoProductId,
          pinduoduoProductImage: req.body.pinduoduoProductImage,
          productName: req.body.productName,
          pinduoduoProductName: req.body.pinduoduoProductName,
          merchantId: req.body.merchantId
        });
        return res.status(201).json(newProduct);

      case 'PUT':
        const { id } = query;
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Invalid product ID' });
        }

        const updatedProduct = await db.updateProduct(id, req.body);

        if (!updatedProduct) {
          return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json(updatedProduct);

      case 'DELETE':
        const deleteId = query.id;
        if (!deleteId || typeof deleteId !== 'string') {
          return res.status(400).json({ error: 'Invalid product ID' });
        }

        const deleted = await db.deleteProduct(deleteId);

        if (!deleted) {
          return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json({ message: 'Product deleted' });

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
