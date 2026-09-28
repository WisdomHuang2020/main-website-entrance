import { ArrowUpRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { ICONS, type Site } from '../data/sites'

/**
 * 站点卡片。
 * index 为该站在清单中的序号（从 1 起），渲染成大号幽灵数字作版面锚点 ——
 * 让工具集看起来像一份"编目"，而不是一堆并列的小方块。
 */
export default function SiteCard({
  site,
  index,
  version,
  live = false,
  className = '',
}: {
  site: Site
  index: number
  /** 生效的版本号：门户运行时能从 /api/version/<id> 取到就用实时值，否则用 sites.json 的静态值 */
  version: string
  /** 该值是否来自实时端点（仅影响 tooltip 文案，便于日后排查"为什么这个数字没变"） */
  live?: boolean
  /** 网格跨度由调用方决定（见 App.tsx 的 6 列网格注释），卡片本身不关心排布 */
  className?: string
}) {
  const Icon = ICONS[site.icon]

  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      // 该子站自己的主色以 CSS 变量注入，hover 态在 index.css 的 .site-card 规则里消费
      style={{ '--accent': site.accent } as CSSProperties}
      className={`site-card group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/70 p-7 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface ${className}`}
    >
      {/* 大号幽灵序号：低透明度，只作版面纹理，不与内容抢读 */}
      <span
        className="pointer-events-none absolute top-5 right-7 font-mono text-[40px] leading-none font-medium tracking-[-0.04em] text-white/[0.07] transition-colors duration-200 group-hover:text-white/[0.12]"
        aria-hidden="true"
      >
        {String(index).padStart(2, '0')}
      </span>

      <span
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${site.accent}1f`, color: site.accent }}
      >
        <Icon className="h-6 w-6" strokeWidth={1.7} />
      </span>

      <h3 className="site-card-title mt-5 text-xl font-semibold tracking-tight text-text-primary transition-colors">
        {site.name}
      </h3>
      <p className="mt-1.5 font-mono text-xs tracking-wide text-text-muted">{site.subtitle}</p>

      <p className="mt-4 flex-1 text-[15px] leading-relaxed text-text-secondary">{site.desc}</p>

      <ul className="mt-5 flex flex-wrap gap-2">
        {site.tags.map((tag) => (
          <li
            key={tag}
            className="rounded border border-border bg-white/[0.03] px-2.5 py-1 text-xs text-text-secondary"
          >
            {tag}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="site-card-version shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] leading-none text-text-muted"
            title={
              live
                ? '该工具当前线上版本 —— 门户实时读取服务器 .deployed-version 哨兵'
                : '该工具当前线上版本 —— 来自门户发布时记录的值（实时端点不可用时显示此值）'
            }
          >
            v{version}
          </span>
          <span className="truncate font-mono text-[11px] text-text-muted">{site.domain}</span>
        </div>
        <ArrowUpRight
          className="site-card-arrow h-4 w-4 shrink-0 text-text-muted transition-all duration-200"
          strokeWidth={1.8}
        />
      </div>
    </a>
  )
}
