// 给全局 console 加上时间戳（中国时区，格式 YYYY-MM-DD HH:mm:ss），
// 便于在宝塔/pm2 等直接看 stdout 时定位每条日志的时间。
// 在 instrumentation.ts 的 register() 里调用一次即可全局生效（含现有所有 console.* 调用）。

function nowStr(): string {
  // sv-SE 本地化恰好输出 "YYYY-MM-DD HH:mm:ss"，配合 Asia/Shanghai 得到中国时间
  return new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function patchConsoleWithTimestamp(): void {
  const g = globalThis as unknown as { __consoleTimestampPatched__?: boolean };
  if (g.__consoleTimestampPatched__) return; // 幂等：热重载/重复调用不重复包裹
  g.__consoleTimestampPatched__ = true;

  const levels = ['log', 'info', 'warn', 'error', 'debug'] as const;
  levels.forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => original(`[${nowStr()}]`, ...args);
  });
}
