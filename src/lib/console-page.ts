import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { resolveTenantSession, type TenantContext } from '@/lib/tenant-auth';

// 控制台页面的服务端守卫。
//
// 为什么校验放在 getServerSideProps 而不是 middleware：middleware 跑在 Edge runtime，
// 用不了 sqlite3（原生模块），没法查会话表。middleware 只能看 cookie 在不在，
// 真正「这个会话还有效吗」必须在这里做——它在 Node runtime，能查库。
//
// 用法：
//   export const getServerSideProps = tenantPageProps;
// 页面组件会拿到 { tenant, user } 两个 props。

export interface ConsolePageProps {
  tenant: { id: string; name: string };
  user: { id: string; username: string; displayName: string; role: 'owner' | 'staff' };
}

export async function tenantPageProps(
  context: GetServerSidePropsContext
): Promise<GetServerSidePropsResult<ConsolePageProps>> {
  let ctx: TenantContext | null = null;
  try {
    // getServerSideProps 的 req 形状与 NextApiRequest 在这两个字段上一致
    ctx = await resolveTenantSession(context.req as never);
  } catch (error) {
    console.error('[console] 解析会话失败:', error);
  }

  if (!ctx) {
    // 会话无效/过期 → 回登录页。带上 from 方便登录后跳回来
    const from = context.resolvedUrl || '/console/mappings';
    return {
      redirect: {
        destination: `/console?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      tenant: { id: ctx.tenantId, name: ctx.tenantName },
      user: {
        id: ctx.user.id,
        username: ctx.user.username,
        displayName: ctx.user.displayName,
        role: ctx.user.role,
      },
    },
  };
}
