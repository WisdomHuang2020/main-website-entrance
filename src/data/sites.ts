import {
  Activity,
  BookOpen,
  Calculator,
  FileText,
  LayoutGrid,
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
 *   原因：optical 站的线上哨兵带 `v` 前缀（其余五站为纯数字）。
 *   ⚠️ 必须三段式 x.y.z：useLiveVersions 的取值正则只认 `^v?(\d+\.\d+\.\d+)$`，
 *   子站哨兵若写成两段式（如 v1.0），端点明明取到了值也会被丢弃，
 *   卡片静默退回静态旧值 —— 且没有任何报错。web-training 首版就是这样，
 *   已在 2026-10-31 改为三段式，并在其 deploy.sh 里加了格式门禁。
 *   若把带 v 的字面量写进源码，scripts/verify-version.mjs 的
 *   「禁止硬编码 vX.Y.Z」断言会把它误判成本站版本号。
 *   巡检脚本 scripts/check-versions.mjs 会自行剥离两侧的 v 再比对。
 *
 * version 的权威来源：服务器上各站 web 根的 `.deployed-version` 哨兵
 * （由各站自己的 CI 写入），不是各站仓库 package.json —— 后者可能领先于线上。
 */

export type SiteIconKey =
  | 'activity'
  | 'waves'
  | 'zap'
  | 'lightbulb'
  | 'calculator'
  | 'book'
  | 'filetext'
  | 'layout'

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
  /** 是否为内网系统（需账号登录、不对公众开放）。
   *  2026-11-07 新增：validation-test 与 psu-model 两个团队内部系统接入门户。
   *  · 首页「工具与课程」只列公开站（SITES），内网站在 `/internal` 这一层单独列（INTERNAL_SITES）；
   *  · 这样首屏的「使用门槛 0 项」等表述仍然成立 —— 内网系统另有登录门禁，不混在公开工具里算。
   *  · id 对公开站必须等于服务器 web 根目录名（/var/www/<id>），巡检脚本依赖此约定；
   *    内网站豁免这条 —— check-versions.mjs 直接跳过 internal，不会去 Lighthouse 上找 /var/www/<id>。
   *  2026-11-09 追加：io（www.io.wx-seastar.cn，团队内部站群总入口）接入，成为第 3 个内网系统。
   *    它跑在阿里云 47.82.x 那台，与本站群不同机、无 `.deployed-version` 哨兵，
   *    version 只能人工维护（当前 1.0.0），改版时需手动同步这个数字。 */
  internal?: boolean
}

export const ICONS: Record<SiteIconKey, LucideIcon> = {
  activity: Activity,
  waves: Waves,
  zap: Zap,
  lightbulb: Lightbulb,
  calculator: Calculator,
  book: BookOpen,
  filetext: FileText,
  layout: LayoutGrid,
}

/** 全量清单（含内网）。sites.json 保持扁平数组 —— scripts/check-versions.mjs 直接按数组读。 */
export const ALL_SITES = raw as unknown as Site[]

/** 公开站：首页卡片墙与首屏统计口径都只认这一份 */
export const SITES = ALL_SITES.filter((s) => !s.internal)

/** 内网站：只在 /internal 这一层展示 */
export const INTERNAL_SITES = ALL_SITES.filter((s) => s.internal)
