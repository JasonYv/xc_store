'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// 「远程映射表地址」卡片。
//
// 租户来控制台，一半是为了维护数据，另一半就是为了拿这个地址去填商家版。
// 所以它放在页面最上面、给一键复制，而不是塞在设置里的某个角落。

export default function RemoteConfigCard({ token }: { token: string }) {
  const { toast } = useToast();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  // origin 只有客户端拿得到（SSR 时没有 window），首帧留空避免水合不一致
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const url = origin && token ? `${origin}/api/ys/${token}` : '';

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: '已复制', description: '粘贴到商家版的「远程映射表」里即可' });
    } catch {
      // 非 https 或浏览器不给剪贴板权限时，退回手动选中
      window.prompt('复制下面的地址：', url);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="size-4" />
          远程映射表地址
        </CardTitle>
        <CardDescription>
          把这个地址填到「商家版」工具的「远程映射表」里，它就会自动读取这里的映射表。
          这里的改动保存后即刻生效，不需要去每台机器上改文件。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-xs">
            {url || '加载中…'}
          </code>
          <Button size="sm" variant="outline" onClick={copy} disabled={!url} className="shrink-0">
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {copied ? '已复制' : '复制'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
