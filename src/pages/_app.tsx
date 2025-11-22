import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useState, useEffect } from 'react'
import { ToastProvider } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toast'

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // 在客户端渲染前不渲染组件，避免水合错误
  if (!mounted) {
    return null;
  }

  return (
    <ToastProvider>
      <Component {...pageProps} />
      <Toaster />
    </ToastProvider>
  );
}
