import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Loader2, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// 租户控制台登录页。
//
// 和内部后台的登录页刻意分开：那套是「前端写个 cookie 就算登录」，这套走
// /api/console/login，服务端建会话、下发 httpOnly cookie。

export default function ConsoleLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // 已经登录的人进来直接放行，别让人再登一次
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/console/me?t=${Date.now()}`)
      .then(res => (res.ok ? res.json() : null))
      .then(body => {
        if (cancelled) return;
        if (body?.success) {
          router.replace('/console/mappings');
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/console/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        setError(body.error || '登录失败，请重试');
        return;
      }
      const from = typeof router.query.from === 'string' ? router.query.from : '/console/mappings';
      // 只接受站内相对路径，避免 from 被塞成外站地址做跳转
      router.replace(from.startsWith('/') ? from : '/console/mappings');
    } catch {
      setError('网络异常，请检查连接后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        正在检查登录状态…
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>商家控制台 - 登录</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Store className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">商家控制台</CardTitle>
              <CardDescription>维护商品映射表，供派单工具远程读取</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700" htmlFor="username">
                  用户名
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  autoComplete="username"
                  className="h-8 text-sm"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700" htmlFor="password">
                  密码
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-8 text-sm"
                  required
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="h-8 w-full text-sm" disabled={submitting}>
                {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                {submitting ? '登录中…' : '登录'}
              </Button>
            </form>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              账号由服务方开通。忘记密码请联系服务方重置。
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
