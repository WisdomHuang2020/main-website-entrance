import { ArrowLeft, Lock } from 'lucide-react'
import SiteCard from '../components/SiteCard'
import { INTERNAL_SITES } from '../data/sites'

/**
 * 第二入口：内网系统页（`/internal`）。
 *
 * 为什么做成**独立一页**而不是首页里的一个区块：
 *   首页是给公众看的（SEO、对外分享），内网系统需要账号且不对外，
 *   混在同一页会同时带来两个问题 —— ① 公众在首屏就看到一堆"打不开"的入口；
 *   ② 首屏「使用门槛 0 项」这类表述立刻自相矛盾。放到下一层，两件事都不冲突。
 *
 * 深链可直接打开 `/internal`：
 *   自有域名靠 nginx 的 `try_files $uri $uri/ /index.html`，
 *   Pages 子路径靠仓库根的 404.html（scripts/copy-404.mjs 生成），
 *   与 /tools、/engineers 同一套兜底，见 src/lib/sectionRoute.ts 的说明。
 *   路径全部用**相对形式**（`./`），Pages 子路径部署才不会 404。
 */
export default function InternalPage() {
  return (
    <div className="shell px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      <a
        href="./"
        className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-brand-light"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
        返回入口
      </a>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold tracking-wide text-text-secondary">
          <Lock className="h-3.5 w-3.5" strokeWidth={2} />
          第二入口 · 内网
        </span>
        <span className="font-mono text-xs text-text-muted">
          {String(INTERNAL_SITES.length).padStart(2, '0')} 个系统
        </span>
      </div>

      <h1 className="mt-6 text-3xl leading-[1.1] font-bold tracking-[-0.02em] sm:text-4xl">
        团队内部系统
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-secondary">
        下面这些系统需要账号与密码登录，不对公众开放，因此不在首页的公开列表里。
        未登录时打开任一系统，都会被拦到登录页。
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {INTERNAL_SITES.map((site, i) => (
          <SiteCard key={site.id} site={site} index={i + 1} version={site.version} />
        ))}
      </div>

      <p className="mt-10 max-w-2xl border-t border-border pt-6 text-sm leading-relaxed text-text-muted">
        版本号取自门户发布时记录的值，不是各系统实时回读的 ——
        内网系统没有对外的版本哨兵端点，门户读不到实时值。
      </p>
    </div>
  )
}
