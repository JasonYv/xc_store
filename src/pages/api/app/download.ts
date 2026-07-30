import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { APP_PACKAGES, AppPlatform } from '@/config/app-download';

/**
 * 安装包下发接口。
 *
 * 不直接让 public/app/ 静态托管，是因为 Next 对 .apk / .mobileconfig
 * 只会回 application/octet-stream —— iOS 拿到 octet-stream 不会弹安装描述文件，
 * 安卓部分浏览器也不会走安装流程。这里显式指定 Content-Type。
 *
 * 真实访问路径是 /app/xc.apk 和 /app/xc.mobileconfig，
 * 由 next.config.js 的 beforeFiles rewrites 转发过来。
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', ['GET', 'HEAD']);
    return res.status(405).end('Method Not Allowed');
  }

  const target = req.query.target as AppPlatform;
  const pkg = APP_PACKAGES[target];

  if (!pkg) {
    return res.status(400).end('Unknown target');
  }

  const filePath = path.join(process.cwd(), 'public', 'app', pkg.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).end('安装包尚未上传');
  }

  const { size } = fs.statSync(filePath);

  res.setHeader('Content-Type', pkg.contentType);
  res.setHeader('Content-Length', size);
  // 安装包会被覆盖更新，不能让浏览器缓存住旧包
  res.setHeader('Cache-Control', 'no-store');
  if (pkg.forceDownload) {
    res.setHeader('Content-Disposition', `attachment; filename="${pkg.fileName}"`);
  }

  if (req.method === 'HEAD') {
    return res.status(200).end();
  }

  fs.createReadStream(filePath).pipe(res);
}
