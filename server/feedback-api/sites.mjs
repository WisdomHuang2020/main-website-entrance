/**
 * 站群接入表 —— 唯一真源。
 * ---------------------------------------------------------------
 * 新增一个站的留言板，只改这里 + 该站 nginx 的两行（X-Site 头与 location /api/）。
 *
 * hosts 的用途有二，缺一不可：
 *   ① 校验管理接口的 Origin 是否属于本站在编域名（CSRF 防线）；
 *   ② 让 `init-site.mjs` 打印出正确的后台地址，避免手抄错域名。
 *
 * 注意：本站群的对外主域一律是 `www.` 开头 —— 裸名在 nginx 里 301 到 www
 * （2026-11-02 统一规则）。两个都列进来，是因为 Origin 可能出现在跳转前的
 * 首帧请求里；只列 www 会误伤。
 */

export const SITE_TABLE = {
  llc: {
    name: 'LLC 谐振变换器设计工具',
    hosts: ['www.llc.power-knowledge.tech', 'llc.power-knowledge.tech'],
    adminPath: '/admin',
    feedbackPath: '/feedback',
  },
  interleavedpfc: {
    name: '交错并联 Boost PFC 设计工具',
    hosts: ['www.interleavedpfc.power-knowledge.tech', 'interleavedpfc.power-knowledge.tech'],
    // 该站 v0.4.0 起路由由 HashRouter 改为 BrowserRouter，后台是 /admin。
    // 若日后又改回 hash 路由，这里与 README 的地址表要一起改。
    adminPath: '/admin',
    feedbackPath: '/feedback',
  },
  ahb: {
    name: 'AHB 不对称半桥反激设计工具',
    hosts: ['www.ahb.power-knowledge.tech', 'ahb.power-knowledge.tech'],
    adminPath: '/admin',
    feedbackPath: '/feedback',
  },
  optical: {
    name: '光学概念和光学设计',
    hosts: ['www.optical.power-knowledge.tech', 'optical.power-knowledge.tech'],
    adminPath: '/admin.html',
    feedbackPath: '/feedback.html',
  },
  'web-training': {
    name: '网站建设实训课',
    hosts: ['www.web-training.power-knowledge.tech', 'web-training.power-knowledge.tech'],
    adminPath: '/admin/',
    feedbackPath: '/feedback/',
  },
  // ── 2026-11-10 补接入的三个公开站 ──────────────────────────────────
  // 这三个站上线时没接留言板，导致门户里有卡片、站内却没有留言入口，
  // 后台也看不到它们的留言。补齐后站群 8 个公开站全部具备留言能力。
  'control-mode': {
    name: '开关变换器 · 建模与控制',
    hosts: ['www.control-mode.power-knowledge.tech', 'control-mode.power-knowledge.tech'],
    adminPath: '/admin',
    feedbackPath: '/feedback',
  },
  'motor-lighting': {
    name: '二轮车照明配光技术站',
    hosts: ['www.motor-lighting.power-knowledge.tech', 'motor-lighting.power-knowledge.tech'],
    adminPath: '/admin',
    feedbackPath: '/feedback',
  },
  // english 是纯静态多页站（非 SPA），沿用 optical 的 .html 后缀约定
  english: {
    name: '外贸英语 · 邮件英语学习站',
    hosts: ['www.english.power-knowledge.tech', 'english.power-knowledge.tech'],
    // 2026-11-11 起后台地址去掉 .html 后缀（nginx 内部重写到 admin.html，
    // 旧地址仍然可用）。这里写不带后缀的形式，运维提示才不会给错链接。
    adminPath: '/admin',
    feedbackPath: '/feedback',
  },
}

export const SITES = new Map(Object.entries(SITE_TABLE))

/** 后台地址拼装：用于日志与运维提示，避免手抄。 */
export function adminUrl(siteId) {
  const s = SITE_TABLE[siteId]
  if (!s) return ''
  return `https://${s.hosts[0]}${s.adminPath}`
}
