// Next.js 启动时调用一次（需在 next.config.js 开启 experimental.instrumentationHook）。
// 用于给服务端所有 console 日志加时间戳。仅在 Node.js 运行时执行。
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { patchConsoleWithTimestamp } = await import('./lib/logger');
    patchConsoleWithTimestamp();
  }
}
