'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import {
  LayoutGrid,
  LogOut,
  Store,
  Table2,
  Users,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// 租户控制台的外壳。骨架和视觉沿用内部后台（同一个 Sidebar 组件族、同一套
// 间距和字号），但导航项、品牌、页脚都是租户视角的——不复用 AppSidebar，
// 那里面写死了内部后台的九项导航和 localStorage 会话逻辑。

export interface ConsoleLayoutProps {
  tenant: { id: string; name: string };
  user: { id: string; displayName: string; role: 'owner' | 'staff' };
  title: string;
  children: ReactNode;
}

function ConsoleSidebar({
  tenant,
  user,
}: {
  tenant: { name: string };
  user: { displayName: string; role: 'owner' | 'staff' };
}) {
  const router = useRouter();

  const items = [
    { title: '商品映射表', url: '/console/mappings', icon: Table2, ownerOnly: false },
    { title: '员工账号', url: '/console/users', icon: Users, ownerOnly: true },
  ].filter(item => !item.ownerOnly || user.role === 'owner');

  const isPathActive = (path: string) => router.pathname.startsWith(path);

  const handleLogout = async () => {
    try {
      await fetch('/api/console/logout', { method: 'POST' });
    } finally {
      router.replace('/console');
    }
  };

  const initials = (user.displayName || '?').slice(0, 1).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:!p-2">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">商家控制台</span>
                <span className="truncate text-xs">{tenant.name}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>商品数据</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={item.title}
                    onClick={() => router.push(item.url)}
                    isActive={isPathActive(item.url)}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.displayName}</span>
                    <span className="truncate text-xs">
                      {user.role === 'owner' ? '管理员' : '普通成员'}
                    </span>
                  </div>
                  <LayoutGrid className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="text-xs text-muted-foreground">{tenant.name}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 size-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function ConsoleLayout({ tenant, user, title, children }: ConsoleLayoutProps) {
  return (
    <SidebarProvider>
      <ConsoleSidebar tenant={tenant} user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">{children}</div>
          <footer className="border-t py-3 text-center">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              陕ICP备2023007060号-1
            </a>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
