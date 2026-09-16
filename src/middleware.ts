import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 这里只做「便宜的」判断，不查库——middleware 跑在 Edge runtime，用不了 sqlite3。
// 所以：
//   · 租户域名下的路径封锁（纯字符串比较）放这里，它是最后一道便宜的保护；
//   · 控制台会话的**真正**校验放在页面的 getServerSideProps（Node runtime，能查库），
//     这里只看 cookie 在不在，避免给明显没登录的人渲染出控制台外壳。

/** 租户域名清单，逗号分隔，来自构建时的 TENANT_HOSTS（见 next.config.js）。
 *  留空 = 不做域名区分，行为与改动前完全一致（本地开发和现有部署都不受影响）。 */
function tenantHosts(): string[] {
  return String(process.env.TENANT_HOSTS || '')
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean);
}

/** 租户域名下允许访问的路径。白名单之外一律 404——**不是 403**，
 *  403 等于承认「这个路径存在只是你没权限」，对扫描者是有效信息。
 *
 *  注意这里**不包含** /uploads/（订单截图）和 /app/（安装包）：它们在内部域名上
 *  是静态直出、本来就没有鉴权，但不能因此让租户域名也顺带把它们端出去。 */
function isAllowedOnTenantHost(pathname: string): boolean {
  return (
    pathname === '/console' ||
    pathname.startsWith('/console/') ||
    pathname.startsWith('/api/console/') ||
    // 桌面端拉远程配置的那条路
    pathname.startsWith('/api/ys/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get('host') || '').toLowerCase();
  const isTenantHost = tenantHosts().includes(host);

  // ==================== 1. 租户域名：把内部那半边关掉 ====================
  // 为什么必须有这一段：内部后台的「登录」只是前端写了个 cookie，服务端从不校验，
  // 内部 /api/* 也完全不查。如果两个域名指向同一个进程，光加个控制台等于把整套
  // 内部管理台（商家、员工、订单、含 apiKey 的设置）摆到一个对外的域名上。
  if (isTenantHost) {
    if (pathname === '/') {
      // 根路径给个顺手的跳转，别让人看到内部登录页
      return NextResponse.redirect(new URL('/console', request.url));
    }
    if (!isAllowedOnTenantHost(pathname)) {
      return new NextResponse(null, { status: 404 });
    }
    // 落到这里说明是允许的路径，继续往下走控制台的分支
  }

  // ==================== 2. 租户控制台 ====================
  if (pathname === '/console') {
    // 登录页本身，放行
    return NextResponse.next();
  }

  if (pathname.startsWith('/console/')) {
    if (!request.cookies.get('tenantSession')) {
      return NextResponse.redirect(new URL('/console', request.url));
    }
    // cookie 存在只是必要条件；是不是有效会话由页面的 getServerSideProps 查库确认
    return NextResponse.next();
  }

  // ==================== 3. 内部后台（保持原样）====================
  // 只对页面路由生效。以前 matcher 只覆盖 '/' 和 '/dashboard/:path*'，现在 middleware
  // 要跑在 /api/* 上（租户域名那段需要），所以这里必须显式限定路径，
  // 否则内部接口会被误重定向到登录页。
  const isInternalPage = pathname === '/' || pathname.startsWith('/dashboard');
  if (!isInternalPage) {
    return NextResponse.next();
  }

  const isAuthenticated = request.cookies.get('isAuthenticated');
  const isLoginPage = pathname === '/';

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 覆盖面比原来宽：/api 也要过一遍，否则租户域名上内部接口是敞开的。
  // 只排除真正无所谓的静态资源（_next/static、favicon）。
  //
  // **特意不排除 `/uploads/` 和 `/app/`**：前者是订单截图（公开可读的静态文件），
  // 后者是 APP 安装包。它们在内部域名上一直是静态直出，但没理由让租户域名也
  // 顺带把它们端出去——放进 matcher 才能在上面那段按域名 404 掉。
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
