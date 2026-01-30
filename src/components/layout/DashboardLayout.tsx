'use client';

import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { SiteHeader } from './SiteHeader';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            {children}
          </div>
          <footer className="py-3 text-center border-t">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              陕ICP备2023007060号-1
            </a>
          </footer>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 