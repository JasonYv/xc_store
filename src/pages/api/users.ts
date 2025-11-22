import { NextApiRequest, NextApiResponse } from 'next';
import { User } from '@/lib/types';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, query } = req;

    // 初始化数据库
    await db.init();

    switch (method) {
      case 'GET':
        if (query.id) {
          // 获取单个用户
          const id = query.id as string;
          const user = await db.getUserById(id);
          
          if (!user) {
            return res.status(404).json({ success: false, error: '用户不存在' });
          }
          
          return res.status(200).json({ success: true, data: user });
        } else {
          // 获取所有用户
          const users = await db.getAllUsers();
          return res.status(200).json({ 
            success: true, 
            data: users
          });
        }

      case 'POST':
        // 创建新用户
        const newUser = await db.createUser({
          username: req.body.username,
          password: req.body.password,
          displayName: req.body.displayName,
          isActive: req.body.isActive !== false
        });

        return res.status(201).json({ success: true, data: newUser });

      case 'PUT':
        // 更新用户
        const { id } = query;
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ success: false, error: '无效的用户ID' });
        }

        const updatedUser = await db.updateUser(id, {
          displayName: req.body.displayName,
          password: req.body.password,
          isActive: req.body.isActive
        });
        
        if (!updatedUser) {
          return res.status(404).json({ success: false, error: '用户不存在' });
        }

        return res.status(200).json({ success: true, data: updatedUser });

      case 'DELETE':
        // 删除用户
        const deleteId = query.id;
        if (!deleteId || typeof deleteId !== 'string') {
          return res.status(400).json({ success: false, error: '无效的用户ID' });
        }

        try {
          const deleted = await db.deleteUser(deleteId);
          
          if (!deleted) {
            return res.status(404).json({ success: false, error: '用户不存在' });
          }

          return res.status(200).json({ success: true, message: '用户已删除' });
        } catch (error) {
          if (error instanceof Error) {
            return res.status(400).json({ success: false, error: error.message });
          }
          throw error;
        }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`方法 ${method} 不允许`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
} 