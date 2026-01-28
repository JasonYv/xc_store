"use client"

import * as React from "react"
import { useRouter } from "next/router"
import {
  Home,
  Users,
  Settings,
  Store,
  LogOut,
  ShoppingCart,
  Package,
  PackageX,
  UserCog,
  FileText,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"

// 基础管理
const baseNavItems = [
  {
    title: "首页",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "商家管理",
    url: "/dashboard/merchants",
    icon: Store,
  },
  {
    title: "商品管理",
    url: "/dashboard/products",
    icon: ShoppingCart,
  },
  {
    title: "订单管理",
    url: "/dashboard/orders",
    icon: Package,
  },
]

// 仓储管理
const warehouseNavItems = [
  {
    title: "当日送货",
    url: "/dashboard/daily-deliveries",
    icon: Package,
  },
  {
    title: "余货/客退",
    url: "/dashboard/return-details",
    icon: PackageX,
  },
  {
    title: "操作日志",
    url: "/dashboard/operation-logs",
    icon: FileText,
  },
]

// 系统管理
const systemNavItems = [
  {
    title: "员工管理",
    url: "/dashboard/employees",
    icon: UserCog,
  },
  {
    title: "管理员",
    url: "/dashboard/users",
    icon: Users,
  },
  {
    title: "系统设置",
    url: "/dashboard/settings",
    icon: Settings,
  },
]


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const { isMobile } = useSidebar()
  const [user, setUser] = React.useState({
    name: "用户",
    email: "user@example.com",
    avatar: "",
  })

  React.useEffect(() => {
    const storedUsername = localStorage.getItem('username')
    if (storedUsername) {
      setUser(prev => ({
        ...prev,
        name: storedUsername,
        email: `${storedUsername}@system.com`,
      }))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    document.cookie = 'isAuthenticated=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/')
  }

  const isPathActive = (path: string) => {
    const currentPath = router.pathname
    if (path === '/dashboard' && currentPath === '/dashboard') {
      return true
    }
    if (path !== '/dashboard' && currentPath.startsWith(path)) {
      return true
    }
    return false
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-2"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Store className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">商家管理系统</span>
                <span className="truncate text-xs">管理平台</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* 基础管理 */}
        <SidebarGroup>
          <SidebarGroupLabel>基础管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {baseNavItems.map((item) => (
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

        <SidebarSeparator />

        {/* 仓储管理 */}
        <SidebarGroup>
          <SidebarGroupLabel>仓储管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {warehouseNavItems.map((item) => (
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

        <SidebarSeparator />

        {/* 系统管理 */}
        <SidebarGroup>
          <SidebarGroupLabel>系统管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
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
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
