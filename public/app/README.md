# APP 安装包目录

把安装包放在本目录，**文件名固定**，换版本直接覆盖同名文件即可，
下载链接和二维码永远不用改。

| 文件 | 平台 | 对外访问路径 |
|------|------|--------------|
| `xc.apk` | 安卓 | `https://<域名>/app/xc.apk` |
| `xc.mobileconfig` | iOS | `https://<域名>/app/xc.mobileconfig` |

## 注意

- 这两个路径不是静态文件直出，而是被 `next.config.js` 的 `rewrites`
  转发到 `/api/app/download`，由接口补上正确的 `Content-Type`：
  APK 用 `application/vnd.android.package-archive`，
  iOS 描述文件用 `application/x-apple-aspen-config`——
  少了这一步 iOS 不会弹「安装描述文件」，只会存进「文件」App。
- 文件名要改的话，改 `src/config/app-download.ts` 和 `next.config.js` 里的 rewrites，两处都要改。
- iOS 描述文件必须在 **Safari** 里打开才能安装，微信 / Chrome 都不行。
- 站点要是有效证书的 **HTTPS**，否则 iOS 拒装、安卓也会拦下载。
- 本目录的 `.apk` / `.mobileconfig` 已在 `.gitignore` 里排除，安装包不进版本库。
