/**
 * 构建后把 dist/index.html 复制一份为 dist/404.html。
 *
 * 为什么需要它（2026-09-28 引入干净 URL 时新增）：
 *   本站的导航已由 `/#tools` 改为 `/tools`（去掉了 #），于是"直接打开或刷新"
 *   /tools、/engineers 这类深链成了必须支持的进入方式。
 *     - 自有域名侧：nginx 的 `try_files $uri $uri/ /index.html` 兜住，没问题；
 *     - **GitHub Pages 不支持 SPA fallback** —— 访问
 *       /main-website-entrance/tools 会返回 GitHub 自己的 404 页，
 *       React 拿不到控制权，页面直接白屏。
 *
 *   按 GitHub Pages 的既有约定，站点根部的 404.html 会被用作自定义 404 页面。
 *   把它做成与 index.html 完全一致，任何未命中的深层路径都会加载 SPA，
 *   再由前端的 sectionRoute 读 pathname 决定滚到哪一段。
 *   这是无服务端配置能力下最标准的做法（姊妹站 widget 同样如此）。
 *
 * 由 package.json 的 build 脚本在 vite build 之后调用。
 * ⚠️ 因此 `npm run build` 的产物里必然同时有 index.html 与 404.html，
 *    线上核验时两者应逐字节相同。
 */
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'dist', 'index.html')
const dst = resolve(root, 'dist', '404.html')

if (!existsSync(src)) {
  // 用 throw 而非 process.exit(1)：同样的非零退出语义，但不依赖 Node 全局变量，
  // 以免 eslint 的 no-undef 规则在未声明 node 环境的 scripts/ 目录下报错。
  throw new Error(`[copy-404] 找不到 ${src} —— 是否漏跑 vite build？`)
}

copyFileSync(src, dst)
console.log('[copy-404] dist/index.html -> dist/404.html（供 GitHub Pages SPA fallback）')
