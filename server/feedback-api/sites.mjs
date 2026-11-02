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
}

export const SITES = new Map(Object.entries(SITE_TABLE))

/** 后台地址拼装：用于日志与运维提示，避免手抄。 */
export function adminUrl(siteId) {
  const s = SITE_TABLE[siteId]
  if (!s) return ''
  return `https://${s.hosts[0]}${s.adminPath}`
}
