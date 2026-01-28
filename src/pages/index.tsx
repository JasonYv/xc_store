import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Loading from '@/components/common/Loading';
import LoginForm from '@/components/auth/LoginForm';

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);

    // 检查登录状态
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated) {
      router.push('/dashboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800"></div>
      
      {/* 装饰性圆形 */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl"></div>
      
      {/* 网格背景 */}
      <div 
        className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"
        style={{ backgroundSize: '60px 60px' }}
      ></div>

      {/* 登录表单 */}
      <div className="relative z-10 w-2/5">
        <LoginForm />
      </div>
    </div>
  );
}
