"use client"

import { useRouter } from "next/router"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

// 页面标题映射
const pageTitleMap: Record<string, string> = {
  '/dashboard': '仪表板',
  '/dashboard/merchants': '商家管理',
  '/dashboard/users': '管理员管理',
  '/dashboard/settings': '系统设置',
}

export function SiteHeader() {
  const router = useRouter()
  const pageTitle = pageTitleMap[router.pathname] || '仪表板'

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
      </div>
    </header>
  )
}
