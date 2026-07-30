import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '@/lib/types';
import { APP_PACKAGES, AppPlatform } from '@/config/app-download';

interface PackageInfo {
  available: boolean;
  /** 已格式化的体积，如 "28.4 MB"；文件不存在时为空 */
  size: string;
}

export type AppInfoResponse = Record<AppPlatform, PackageInfo>;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function inspect(fileName: string): PackageInfo {
  const filePath = path.join(process.cwd(), 'public', 'app', fileName);
  if (!fs.existsSync(filePath)) {
    return { available: false, size: '' };
  }
  return { available: true, size: formatSize(fs.statSync(filePath).size) };
}

/** 供下载页判断安装包是否已上传，避免点了按钮才发现 404 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<AppInfoResponse | null>>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      data: null,
      error: `Method ${req.method} Not Allowed`,
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    success: true,
    data: {
      android: inspect(APP_PACKAGES.android.fileName),
      ios: inspect(APP_PACKAGES.ios.fileName),
    },
  });
}
