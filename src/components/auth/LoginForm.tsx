import { useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // 调用登录API
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const {data,success,message} = await response.json();
      if (success) {
        // 登录成功
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('role', data.user.role || 'admin');
        
        // 设置cookie
        document.cookie = 'isAuthenticated=true; path=/';
        
        // 跳转到仪表盘
        router.push('/dashboard');
      } else {
        // 登录失败
        setError(message || '用户名或密码错误');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('登录错误:', err);
      setError('登录过程中发生错误，请重试');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl border-0">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <LockClosedIcon className="w-10 h-10 text-white" />
          </div>
        </div>
        <CardTitle className="text-center text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          商家管理系统
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-8 px-8">
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-center text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-semibold text-gray-600">
              用户名
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="pl-10 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-12 text-base"
                placeholder="请输入用户名"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-semibold text-gray-600">
              密码
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockClosedIcon className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pl-10 bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-12 text-base"
                placeholder="请输入密码"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-base"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在登录...
              </span>
            ) : "登录系统"}
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="text-center text-sm text-gray-500 pb-6">
        © 2024 商家管理系统. All rights reserved.
      </CardFooter>
    </Card>
  );
} 