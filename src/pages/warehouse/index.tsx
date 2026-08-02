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
  Loader2,
  ShieldAlert,
  Check,
  Copy,
  X
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

  // 忘记密码：用登录码重设密码，成功后会拿到新的登录码
  const [showForgot, setShowForgot] = useState(false);
  const [forgotCode, setForgotCode] = useState('');
  const [forgotPwd, setForgotPwd] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotNewCode, setForgotNewCode] = useState('');
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

  const closeForgot = () => {
    setShowForgot(false);
    setForgotCode('');
    setForgotPwd('');
    setForgotConfirm('');
    setForgotError('');
  };

  // 用登录码重设密码。登录码本身就是身份凭证，所以不需要旧密码
  const handleForgotPassword = async () => {
    const code = forgotCode.trim().toUpperCase();

    if (!code || !forgotPwd || !forgotConfirm) {
      setForgotError('请填写登录码和新密码');
      return;
    }
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      setForgotError('登录码必须是8位大写字母和数字');
      return;
    }
    if (forgotPwd !== forgotConfirm) {
      setForgotError('两次输入的密码不一致');
      return;
    }
    // 与后端同一套规则，先在前端拦一道
    if (!/^(?=.*[A-Za-z])(?=.*\d)\S{8,}$/.test(forgotPwd)) {
      setForgotError('密码至少8位，且必须同时包含字母和数字');
      return;
    }

    setForgotSubmitting(true);
    setForgotError('');
    try {
      const res = await fetch(`/api/public/employee-change-password?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginCode: code, newPassword: forgotPwd })
      });
      const data = await res.json();

      if (!data.success) {
        setForgotError(data.error || '修改失败');
        return;
      }

      setShowForgot(false);
      setForgotCode('');
      setForgotPwd('');
      setForgotConfirm('');
      setForgotNewCode(data.data.loginCode);
    } catch (err) {
      setForgotError('网络错误，请重试');
    } finally {
      setForgotSubmitting(false);
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

        {/* 忘记密码：用登录码重设 */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowForgot(true)}
            className="text-sm text-slate-500 active:text-blue-600"
          >
            忘记密码？用登录码重设
          </button>
        </div>

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

      {/* 忘记密码弹窗 */}
      {showForgot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60" onClick={closeForgot} />

          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-600" />
                用登录码重设密码
              </h3>
              <button
                onClick={closeForgot}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 改完会换登录码，改之前就要让人知道 */}
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                重设后<span className="font-bold">登录码会同时更换</span>，旧登录码立即失效，
                请务必记下新的登录码。
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <input
                type="text"
                value={forgotCode}
                onChange={(e) => { setForgotCode(e.target.value.toUpperCase()); setForgotError(''); }}
                placeholder="当前登录码（8位）"
                maxLength={8}
                className="w-full h-12 px-4 border border-slate-200 rounded-xl tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={forgotPwd}
                onChange={(e) => { setForgotPwd(e.target.value); setForgotError(''); }}
                placeholder="新密码（至少8位，含字母和数字）"
                className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                value={forgotConfirm}
                onChange={(e) => { setForgotConfirm(e.target.value); setForgotError(''); }}
                placeholder="确认新密码"
                className="w-full h-12 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {forgotError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {forgotError}
              </div>
            )}

            <button
              onClick={handleForgotPassword}
              disabled={forgotSubmitting}
              className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
            >
              {forgotSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" />提交中…</>
              ) : '确认重设'}
            </button>
          </div>
        </div>
      )}

      {/* 新登录码：必须点确认才能关 */}
      {forgotNewCode && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60" />

          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-9 h-9 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">密码重设成功</h3>
            <p className="text-sm text-slate-500 mb-5">
              登录码已更换，旧登录码已失效。<br />请记下新的登录码：
            </p>

            <div className="mb-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <div className="text-3xl font-bold text-blue-700 tracking-[0.2em]">
                {forgotNewCode}
              </div>
            </div>

            <button
              onClick={() => navigator.clipboard?.writeText(forgotNewCode)}
              className="mb-5 text-sm text-blue-600 font-medium inline-flex items-center gap-1"
            >
              <Copy className="w-4 h-4" />
              复制登录码
            </button>

            <button
              onClick={() => {
                // 顺手把新登录码填进登录框，员工可以直接登录
                setLoginCode(forgotNewCode);
                setLoginType('code');
                setForgotNewCode('');
              }}
              className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl active:scale-[0.98]"
            >
              我已记下，去登录
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .pb-safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
