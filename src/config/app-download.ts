/**
 * APP 下载配置
 *
 * 安装包放在 public/app/ 下，文件名固定（换版本直接覆盖同名文件，
 * 二维码和下载链接永远不变）。
 */

export type AppPlatform = 'android' | 'ios';

interface AppPackage {
  /** public/app/ 下的文件名 */
  fileName: string;
  /**
   * 下发时的 Content-Type。这一项不能省：
   * - iOS 描述文件必须是 application/x-apple-aspen-config，
   *   Safari 才会弹出「安装描述文件」，否则只会存进「文件」App。
   * - APK 用官方类型，部分安卓浏览器才会走安装流程而不是当成未知文件。
   */
  contentType: string;
  /** 是否强制当附件下载。iOS 描述文件必须为 false，否则不触发安装 */
  forceDownload: boolean;
}

export const APP_PACKAGES: Record<AppPlatform, AppPackage> = {
  android: {
    fileName: 'xc.apk',
    contentType: 'application/vnd.android.package-archive',
    forceDownload: true,
  },
  ios: {
    fileName: 'xc.mobileconfig',
    contentType: 'application/x-apple-aspen-config',
    forceDownload: false,
  },
};

/** 对外暴露的下载路径，由 next.config.js 的 rewrites 指向下载接口 */
export const APP_DOWNLOAD_PATH: Record<AppPlatform, string> = {
  android: `/app/${APP_PACKAGES.android.fileName}`,
  ios: `/app/${APP_PACKAGES.ios.fileName}`,
};

/** 下载页路径，二维码内容即 `${origin}${APP_DOWNLOAD_PAGE}` */
export const APP_DOWNLOAD_PAGE = '/download';
