import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Warehouse,
  Phone,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Loader2
} from 'lucide-react';

// Cookie 操作工具函数
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function WarehouseLogin() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 检查已登录状态，自动跳转
  useEffect(() => {
    const checkAuth = () => {
      // 先检查 Cookie
      const cookieData = getCookie('warehouseEmployee');
      if (cookieData) {
        try {
          const employee = JSON.parse(cookieData);
          if (employee && employee.id) {
            // 同步到 localStorage
            localStorage.setItem('warehouseEmployee', cookieData);
            router.replace('/warehouse/app');
            return;
          }
        } catch (e) {
          // Cookie 数据无效，忽略
        }
      }

      // 再检查 localStorage
      const localData = localStorage.getItem('warehouseEmployee');
      if (localData) {
        try {
          const employee = JSON.parse(localData);
          if (employee && employee.id) {
            // 同步到 Cookie
            setCookie('warehouseEmployee', localData, 30);
            router.replace('/warehouse/app');
            return;
          }
        } catch (e) {
          // localStorage 数据无效，忽略
        }
      }

      setCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('请输入手机号和密码');
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('手机号格式不正确');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/public/employee-login?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await res.json();

      if (data.success) {
        // 保存员工信息到 localStorage 和 Cookie（30天有效期）
        const employeeJson = JSON.stringify(data.data);
        localStorage.setItem('warehouseEmployee', employeeJson);
        setCookie('warehouseEmployee', employeeJson, 30);
        router.push('/warehouse/app');
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginCode) {
      setError('请输入登录码');
      return;
    }

    if (!/^[A-Z0-9]{8}$/.test(loginCode.toUpperCase())) {
      setError('登录码格式不正确，必须是8位大写字母和数字');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/public/employee-login?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginCode: loginCode.toUpperCase() })
      });

      const data = await res.json();

      if (data.success) {
        const employeeJson = JSON.stringify(data.data);
        localStorage.setItem('warehouseEmployee', employeeJson);
        setCookie('warehouseEmployee', employeeJson, 30);
        router.push('/warehouse/app');
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 检查登录状态时显示加载
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex flex-col">
      <Head>
        <title>仓库作业系统 - 员工登录</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Logo Header */}
      <div className="flex-shrink-0 pt-16 pb-8 px-6">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Warehouse className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">仓库作业系统</h1>
          <p className="text-blue-200 text-sm">员工登录</p>
        </div>
      </div>

      {/* Login Card */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-safe-area-inset-bottom">
        {/* Tab Switcher */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setLoginType('phone'); setError(''); }}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
              loginType === 'phone'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            手机号登录
          </button>
          <button
            onClick={() => { setLoginType('code'); setError(''); }}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
              loginType === 'code'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            登录码登录
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Phone Login Form */}
        {loginType === 'phone' && (
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">手机号</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  maxLength={11}
                  className="w-full h-12 pl-12 pr-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full h-12 pl-12 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  登录
                </>
              )}
            </button>
          </form>
        )}

        {/* Code Login Form */}
        {loginType === 'code' && (
          <form onSubmit={handleCodeLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">登录码</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                  placeholder="请输入8位登录码"
                  maxLength={8}
                  className="w-full h-12 pl-12 pr-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-lg tracking-widest uppercase"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">登录码由8位大写字母和数字组成</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  登录
                </>
              )}
            </button>
          </form>
        )}

        {/* Register Link */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm mb-3">还没有账号？</p>
          <button
            onClick={() => router.push('/warehouse/register')}
            className="w-full h-12 border-2 border-blue-600 text-blue-600 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] active:bg-blue-50"
          >
            <UserPlus className="w-5 h-5" />
            注册新账号
          </button>
        </div>
      </div>

      <style jsx global>{`
        .pb-safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
