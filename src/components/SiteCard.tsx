import { ArrowUpRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { ICONS, type Site } from '../data/sites'

export default function SiteCard({ site }: { site: Site }) {
  const Icon = ICONS[site.icon]

  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      // 该子站自己的主色以 CSS 变量注入，hover 态在 index.css 的 .site-card 规则里消费
      style={{ '--accent': site.accent } as CSSProperties}
      className="site-card group flex flex-col rounded-xl border border-border bg-surface/70 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${site.accent}1f`, color: site.accent }}
        >
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span
          className="site-card-version shrink-0 rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] leading-none text-text-muted"
          title="该工具当前线上版本（来源：服务器 .deployed-version 哨兵）"
        >
          v{site.version}
        </span>
      </div>

      <h3 className="site-card-title mt-4 text-lg font-semibold tracking-tight text-text-primary transition-colors">
        {site.name}
      </h3>
      <p className="mt-1 font-mono text-[11px] tracking-wide text-text-muted">{site.subtitle}</p>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">{site.desc}</p>

      <ul className="mt-4 flex flex-wrap gap-1.5">
        {site.tags.map((tag) => (
          <li
            key={tag}
            className="rounded border border-border bg-white/[0.03] px-2 py-0.5 text-[11px] text-text-secondary"
          >
            {tag}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="truncate font-mono text-[11px] text-text-muted">{site.domain}</span>
        <ArrowUpRight
          className="site-card-arrow h-4 w-4 shrink-0 text-text-muted transition-all duration-200"
          strokeWidth={1.8}
        />
      </div>
    </a>
  )
}
