'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Info } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import MappingManager from '@/components/console/MappingManager';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 云仓自用的派单表商品映射表。
//
// 原来这份表是 xlsx，放在跑云仓版的那台机器上（GUI「映射表路径」）；改商品就得去
// 机器上换文件。现在放这里维护，云仓版出派单表时用 API 地址 + API 密钥自动拉取
// （/api/public/dispatch-mapping），本地文件只作为拉不到时的兜底。
// 维护界面与租户控制台共用 MappingManager，数据按 CLOUD_MAPPING_TENANT_ID 隔离。

export default function DispatchMappingsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  // 与其它 dashboard 页面一致的前端登录判断
  useEffect(() => {
    if (!localStorage.getItem('isAuthenticated')) {
      router.push('/');
      return;
    }
    setAuthed(true);
  }, [router]);

  if (!authed) return null;

  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="size-4" />
            派单表映射表
          </CardTitle>
          <CardDescription>
            云仓版出派单表时，会用「API地址 + API密钥」自动从这里拉取映射表（按 productId 匹配派单商品名和规格），
            保存后下一次出表即生效，不用再去机器上换文件。后台拉不到或这里还是空表时，云仓版会先用上次拉到的缓存，
            再退回 GUI 里「映射表路径」那份本地文件。首次使用请把现有映射表 xlsx「导入」进来。
          </CardDescription>
        </CardHeader>
      </Card>
      <MappingManager apiBase="/api/dispatch-mappings" consumerLabel="云仓版" />
    </DashboardLayout>
  );
}
