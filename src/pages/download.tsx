import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  Apple,
  Smartphone,
  Download,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Compass,
  MoreHorizontal,
} from 'lucide-react';
import QRCode from 'qrcode';
import { APP_DOWNLOAD_PATH } from '@/config/app-download';
import type { AppInfoResponse } from './api/app/info';

type Platform = 'ios' | 'android' | 'other';

/** 只读 UA 判断平台。iPadOS 13+ 的 Safari 会伪装成 Mac，用触点数补判 */
function detectPlatform(ua: string): Platform {
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) {
    return 'ios';
  }
  return 'other';
}

const isWeChat = (ua: string) => /micromessenger/i.test(ua);
/** iOS 装描述文件必须走 Safari，第三方浏览器内核受限装不了 */
const isIosSafari = (ua: string) =>
  /safari/i.test(ua) && !/crios|fxios|edgios|quark|ucbrowser|mqqbrowser|micromessenger/i.test(ua);

export default function DownloadPage() {
  const [platform, setPlatform] = useState<Platform>('other');
  const [inWeChat, setInWeChat] = useState(false);
  const [needSafari, setNeedSafari] = useState(false);
  const [info, setInfo] = useState<AppInfoResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [detected, setDetected] = useState(false);

  // UA 检测放 effect 里，避免 SSR 与客户端渲染结果不一致
  useEffect(() => {
    const ua = navigator.userAgent;
    const p = detectPlatform(ua);
    setPlatform(p);
    setInWeChat(isWeChat(ua));
    setNeedSafari(p === 'ios' && !isWeChat(ua) && !isIosSafari(ua));
    setDetected(true);
  }, []);

  useEffect(() => {
    fetch(`/api/app/info?t=${Date.now()}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setInfo(res.data);
      })
      .catch(() => setInfo(null));
  }, []);

  // 电脑上打开时给张二维码，方便用手机扫
  useEffect(() => {
    if (!detected || platform !== 'other') return;
    QRCode.toDataURL(window.location.href, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [detected, platform]);

  const download = useCallback((target: 'ios' | 'android') => {
    window.location.href = APP_DOWNLOAD_PATH[target];
  }, []);

  const androidReady = info?.android.available !== false;
  const iosReady = info?.ios.available !== false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-600 to-slate-100 font-sans">
      <Head>
        <title>下载仓库作业系统 APP</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* 微信内置浏览器装不了 APK / 描述文件，必须引导到系统浏览器 */}
      {inWeChat && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm p-6 flex flex-col">
          <div className="flex justify-end items-start">
            <div className="text-white text-right animate-bounce">
              <MoreHorizontal className="w-10 h-10 ml-auto" />
              <p className="text-sm font-bold mt-1">点这里 ↑</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center text-white">
            <AlertTriangle className="w-16 h-16 text-amber-400 mb-5" />
            <h2 className="text-2xl font-black mb-3">请在浏览器中打开</h2>
            <p className="text-white/80 leading-relaxed max-w-xs">
              微信内无法安装 APP。请点击右上角
              <span className="mx-1 font-bold text-white">···</span>
              按钮，选择
              <span className="mx-1 font-bold text-amber-300">
                {platform === 'ios' ? '「在 Safari 中打开」' : '「在浏览器打开」'}
              </span>
              后再下载。
            </p>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto px-6 pt-14 pb-10">
        {/* Logo & 标题 */}
        <div className="text-center text-white mb-10">
          <div className="w-20 h-20 mx-auto mb-4 bg-white/15 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Download className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black mb-1">仓库作业系统</h1>
          <p className="text-blue-100 text-sm">扫码安装，随时随地分拣入库</p>
        </div>

        {/* 下载卡片 */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          {!detected ? (
            <div className="h-40 flex items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* iOS 非 Safari 提示：描述文件只有 Safari 能装 */}
              {needSafari && (
                <div className="mb-5 flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <Compass className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 leading-relaxed">
                    当前浏览器无法安装描述文件，请复制本页地址到
                    <span className="font-bold"> Safari </span>
                    中打开。
                  </p>
                </div>
              )}

              {/* 主按钮：按检测到的平台 */}
              {platform === 'ios' && (
                <PrimaryButton
                  icon={<Apple className="w-6 h-6" />}
                  title="下载 iOS 版"
                  subtitle={iosReady ? `描述文件${info?.ios.size ? ` · ${info.ios.size}` : ''}` : '安装包尚未上传'}
                  disabled={!iosReady}
                  onClick={() => download('ios')}
                />
              )}

              {platform === 'android' && (
                <PrimaryButton
                  icon={<Smartphone className="w-6 h-6" />}
                  title="下载安卓版"
                  subtitle={androidReady ? `APK 安装包${info?.android.size ? ` · ${info.android.size}` : ''}` : '安装包尚未上传'}
                  disabled={!androidReady}
                  onClick={() => download('android')}
                />
              )}

              {/* 电脑端：给二维码 */}
              {platform === 'other' && (
                <div className="flex flex-col items-center py-2">
                  <p className="text-slate-500 text-sm mb-4">请用手机扫码安装</p>
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="下载二维码" className="w-52 h-52 rounded-xl border border-slate-200" />
                  ) : (
                    <div className="w-52 h-52 rounded-xl border border-slate-200 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                    </div>
                  )}
                </div>
              )}

              {/* 另一平台的备用入口，检测错了也能自己选 */}
              <div className="mt-5 pt-5 border-t border-slate-100 space-y-2">
                <p className="text-xs text-slate-400 text-center mb-3">其他设备</p>
                {platform !== 'android' && (
                  <SecondaryButton
                    icon={<Smartphone className="w-4 h-4" />}
                    label={androidReady ? '安卓版 APK' : '安卓版（未上传）'}
                    disabled={!androidReady}
                    onClick={() => download('android')}
                  />
                )}
                {platform !== 'ios' && (
                  <SecondaryButton
                    icon={<Apple className="w-4 h-4" />}
                    label={iosReady ? 'iOS 描述文件' : 'iOS 版（未上传）'}
                    disabled={!iosReady}
                    onClick={() => download('ios')}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* 安装说明 */}
        <div className="mt-6 bg-white/70 backdrop-blur rounded-2xl p-5 text-sm text-slate-600 leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-slate-800 mb-3">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            安装说明
          </div>
          <p className="font-semibold text-slate-700 mb-1">iPhone / iPad</p>
          <ol className="list-decimal list-inside space-y-1 mb-4 text-slate-500">
            <li>用 <span className="font-semibold text-slate-700">Safari</span> 打开本页并点击下载</li>
            <li>弹窗点「允许」，提示已下载描述文件</li>
            <li>打开「设置」→ 顶部「已下载描述文件」→ 安装</li>
            <li>「设置 → 通用 → VPN与设备管理」中信任该描述文件</li>
          </ol>
          <p className="font-semibold text-slate-700 mb-1">安卓</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-500">
            <li>点击下载 APK，等待完成</li>
            <li>提示「未知来源」时选择允许本次安装</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function PrimaryButton({
  icon,
  title,
  subtitle,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-4 p-5 rounded-2xl text-white transition-all ${
        disabled
          ? 'bg-slate-300 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-200 active:scale-[0.98]'
      }`}
    >
      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">{icon}</div>
      <div className="text-left">
        <div className="text-lg font-bold">{title}</div>
        <div className="text-white/75 text-xs">{subtitle}</div>
      </div>
    </button>
  );
}

function SecondaryButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
        disabled
          ? 'border-slate-100 text-slate-300 cursor-not-allowed'
          : 'border-slate-200 text-slate-600 active:scale-[0.98] active:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
