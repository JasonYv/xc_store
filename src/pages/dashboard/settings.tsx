'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SettingsForm from '@/components/settings/SettingsForm';
import Loading from '@/components/common/Loading';

export default function SettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // 检查登录状态
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [router]);
  
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loading />
      </div>
    );
  }
  
  return (
    <DashboardLayout>
      <SettingsForm />
    </DashboardLayout>
  );
} 