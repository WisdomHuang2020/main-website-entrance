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
/**
 * 2026-11-11 修正（版本 1.8.10）：本页原先直接把 `site.version`（sites.json 静态值）传给
 * SiteCard，而 useLiveVersions 的结果只在 App.tsx 的首页公开站卡片墙被消费 ⇒
 * 内网系统即便配了 /api/version/<id> 端点也读不到，卡片会一直挂着旧版本号。
 * 实测证据：当日 16:47 smartbin 哨兵发到 0.3.0，线上 /internal 仍显示 0.2.2。
 * 现在由 App 把 liveVersions 传进来，三站与公开站一样走「实时优先、静态兜底」。
 */
export default function InternalPage({ liveVersions }: { liveVersions: Record<string, string> }) {
  return (
    <div className="shell px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
      {/* 「返回入口」已移到**页头导航**（2026-11-07）：页头是吸顶的，比页面内链接始终可见；
          两处都放会让同一页出现两个「返回入口」，反而要用户猜哪个才是上一级。 */}

      {/* 与首屏「第二入口」的大药丸**逐字同款**（脉冲点 → 词组 + 渲染圆点 → 末词），
          只去掉 self-start：这里是块级一行，不需要收缩到内容宽。
          点进下一层还能认出同一个入口，是这次「首屏 + 内网页」风格同步的锚点。
          原先这里是 text-xs 的小 badge + Lock 图标，与首屏的大药丸完全两套语言。 */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-internal/35 bg-internal/10 px-5 py-2 text-2xl font-bold text-internal-light">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-internal-light" />
          <span className="inline-flex items-center gap-[8px] whitespace-nowrap">
            <span>内网</span>
            <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-internal-light" aria-hidden="true" />
          </span>
          <span className="whitespace-nowrap">需登录</span>
        </span>
        <span className="font-mono text-xs text-text-muted">
          {String(INTERNAL_SITES.length).padStart(2, '0')} 个系统
        </span>
      </div>

      <h1 className="mt-6 text-3xl leading-[1.1] font-bold tracking-[-0.02em] sm:text-4xl">
        团队内部系统
      </h1>
      {/* 拆成两句独立段落：原来是一整段，在 1080px 下会断在「未登录时打｜开任一系统」，
          把「打开」这个词从中间劈开（实测截图）。拆段后两句各自断行，不会再跨句劈词。 */}
      <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-secondary">
        下面这些系统需要账号与密码登录，不对公众开放，因此不在首页的公开列表里。
      </p>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-text-secondary">
        未登录时打开任一系统，都会被拦到登录页。
      </p>

      {/* 内网系统 2026-11-11 起为 4 条 → 桌面 2 列 × 2 行，移动端 1 列。
          3 条时期曾用自定义 .internal-sites-grid 在 ≥960px 强制 3 列收成一排；
          数量变 4 后 3 列会留下孤零零的第 4 张，而 4 列在 960px 下每卡不足 240px
          （原注释实测 820px 三列时标题已断成「…入口 / 口」两行），故改为 2×2。
          排布沿革与断点实测记录见 src/index.css 末尾。 */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {INTERNAL_SITES.map((site, i) => {
          const liveVer = liveVersions[site.id]
          return (
            <SiteCard
              key={site.id}
              site={site}
              index={i + 1}
              version={liveVer ?? site.version}
              live={!!liveVer}
            />
          )
        })}
      </div>
    </div>
  )
}
