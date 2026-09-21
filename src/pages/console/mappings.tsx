import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';

import ConsoleLayout from '@/components/console/ConsoleLayout';
import RemoteConfigCard from '@/components/console/RemoteConfigCard';
import MappingManager from '@/components/console/MappingManager';
import { tenantPageProps, type ConsolePageProps } from '@/lib/console-page';

// 租户的商品映射表。表里存的就是商家版桌面端读的那份数据（远程接口按 productId 匹配），
// 这里改一行，商家版下次拉取就生效——不用再去每台机器上换文件。
// 维护界面本体在 MappingManager（与云仓内部后台共用）。

export const getServerSideProps: GetServerSideProps<ConsolePageProps> = tenantPageProps;

const redirectToLogin = () => {
  window.location.href = '/console';
};

export default function ConsoleMappings({ tenant, user }: ConsolePageProps) {
  const [token, setToken] = useState('');

  useEffect(() => {
    fetch(`/api/console/me?t=${Date.now()}`)
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (body?.success) setToken(body.data.tenant.token || '');
      })
      .catch(() => undefined);
  }, []);

  return (
    <ConsoleLayout tenant={tenant} user={{ ...user }} title="商品映射表">
      <RemoteConfigCard token={token} />
      <MappingManager
        apiBase="/api/console/mappings"
        consumerLabel="商家版"
        onUnauthorized={redirectToLogin}
      />
    </ConsoleLayout>
  );
}
