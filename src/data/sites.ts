import {
  Activity,
  Calculator,
  Lightbulb,
  Waves,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import raw from './sites.json'

/**
 * 站点清单数据层。
 *
 * 数据本体放在 sites.json —— 目的有二：
 *   ① 让 scripts/check-versions.mjs 能用 fs 直接读，不必解析 TypeScript；
 *   ② 「要新增一个子站，只改这一个文件」这条约定可被脚本强制检查。
 *
 * version 的填写口径（重要）：
 *   写**不带 v 前缀**的纯语义化版本号，渲染时统一补 `v`。
 *   原因：optical 站的线上哨兵带 `v` 前缀（其余四站为纯数字）。
 *   若把带 v 的字面量写进源码，scripts/verify-version.mjs 的
 *   「禁止硬编码 vX.Y.Z」断言会把它误判成本站版本号。
 *   巡检脚本 scripts/check-versions.mjs 会自行剥离两侧的 v 再比对。
 *
 * version 的权威来源：服务器上各站 web 根的 `.deployed-version` 哨兵
 * （由各站自己的 CI 写入），不是各站仓库 package.json —— 后者可能领先于线上。
 */

export type SiteIconKey = 'activity' | 'waves' | 'zap' | 'lightbulb' | 'calculator'

export interface Site {
  /** 同时用作服务器 web 根目录名：/var/www/<id>（巡检脚本依赖此约定） */
  id: string
  name: string
  subtitle: string
  domain: string
  url: string
  desc: string
  tags: string[]
  /** 该子站自己的主色，用于卡片点缀，取自各站 src/index.css 的 --color-primary */
  accent: string
  icon: SiteIconKey
  version: string
}

export const ICONS: Record<SiteIconKey, LucideIcon> = {
  activity: Activity,
  waves: Waves,
  zap: Zap,
  lightbulb: Lightbulb,
  calculator: Calculator,
}

export const SITES = raw as unknown as Site[]
