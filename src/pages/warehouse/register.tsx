import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Warehouse,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Copy,
  KeyRound
} from 'lucide-react';

export default function WarehouseRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 注册成功状态
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registeredEmployee, setRegisteredEmployee] = useState<{
    employeeNumber: string;
    loginCode: string;
    name: string;
  } | null>(null);
  const [copied, setCopied] = useState<'number' | 'code' | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证姓名
    if (!name || name.trim().length < 2) {
      setError('姓名至少需要2个字符');
      return;
    }

    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      setError('手机号格式不正确');
      return;
    }

    // 验证密码
    if (!password || password.length < 6) {
      setError('密码至少需要6个字符');
      return;
    }

    // 确认密码
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/public/employee-register?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone,
          password
        })
      });

      const data = await res.json();

      if (data.success) {
        setRegisterSuccess(true);
        setRegisteredEmployee({
          employeeNumber: data.data.employeeNumber,
          loginCode: data.data.loginCode,
          name: data.data.name
        });
      } else {
        setError(data.error || '注册失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, type: 'number' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  // 注册成功界面
  if (registerSuccess && registeredEmployee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex flex-col">
        <Head>
          <title>注册成功 - 仓库作业系统</title>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        </Head>

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe-area-inset-bottom">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">注册成功！</h1>
          <p className="text-emerald-100 text-center mb-8">
            欢迎 {registeredEmployee.name}，请保存以下信息
          </p>

          {/* Info Card */}
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
            {/* Employee Number */}
            <div className="mb-4">
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">员工编号</label>
              <div className="flex items-center justify-between mt-1 p-3 bg-slate-50 rounded-xl">
                <span className="font-mono text-lg font-bold text-slate-800">
                  {registeredEmployee.employeeNumber}
                </span>
                <button
                  onClick={() => handleCopy(registeredEmployee.employeeNumber, 'number')}
                  className={`p-2 rounded-lg transition-all ${
                    copied === 'number'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-slate-200 text-slate-600 active:bg-slate-300'
                  }`}
                >
                  {copied === 'number' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Code */}
            <div className="mb-6">
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider">登录码</label>
              <div className="flex items-center justify-between mt-1 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-500" />
                  <span className="font-mono text-xl font-black text-blue-700 tracking-widest">
                    {registeredEmployee.loginCode}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(registeredEmployee.loginCode, 'code')}
                  className={`p-2 rounded-lg transition-all ${
                    copied === 'code'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-blue-200 text-blue-600 active:bg-blue-300'
                  }`}
                >
                  {copied === 'code' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                可使用登录码快速登录，请妥善保管
              </p>
            </div>

            {/* Go to Login */}
            <button
              onClick={() => router.push('/warehouse')}
              className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              前往登录
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex flex-col">
      <Head>
        <title>员工注册 - 仓库作业系统</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* Header */}
      <div className="flex-shrink-0 pt-4 px-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">返回</span>
        </button>
      </div>

      {/* Logo */}
      <div className="flex-shrink-0 pt-8 pb-6 px-6">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Warehouse className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">员工注册</h1>
          <p className="text-blue-200 text-sm">创建您的仓库作业账号</p>
        </div>
      </div>

      {/* Register Card */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-6 pb-safe-area-inset-bottom overflow-y-auto">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              姓名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入真实姓名"
                className="w-full h-12 pl-12 pr-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">姓名将用于自动生成员工编号</p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              手机号 <span className="text-red-500">*</span>
            </label>
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

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              密码 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码（至少6位）"
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              确认密码 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入密码"
                className="w-full h-12 pl-12 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  立即注册
                </>
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center pt-2">
            <p className="text-slate-500 text-sm">
              已有账号？
              <button
                type="button"
                onClick={() => router.push('/warehouse')}
                className="text-blue-600 font-medium ml-1"
              >
                立即登录
              </button>
            </p>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .pb-safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
