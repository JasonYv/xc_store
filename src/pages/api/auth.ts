import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/sqlite-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).end(`方法 ${req.method} 不允许`);
    }

    // 初始化数据库
    await db.init();

    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: '请提供用户名和密码' 
      });
    }

    const user = await db.validateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: '用户名或密码错误' 
      });
    }

    // 登录成功，移除密码
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({ 
      success: true, 
      data: {
        user: userWithoutPassword,
        token: 'authenticated' // 简单实现，实际项目中应使用JWT等
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
} 