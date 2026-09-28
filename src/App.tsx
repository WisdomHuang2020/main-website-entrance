import {
  ArrowDown,
  Cpu,
  FunctionSquare,
  Github,
  Layers,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import Footer from './components/Footer'
import Header from './components/Header'
import SiteCard from './components/SiteCard'
import { SITES } from './data/sites'
import { useLiveVersions } from './data/useLiveVersions'

const REPO_URL = 'https://github.com/WisdomHuang2020/main-website-entrance'

/** 首屏四个数字。全部为可核实事实，不写修辞：
 *  工具数 5（sites.json 长度）、后端依赖 0 与数据上传 0（五个子站 src/ 内
 *  fetch/axios/XMLHttpRequest/sendBeacon/WebSocket 命中均为 0 行，且部署形态是
 *  nginx 托管纯静态文件，不存在后端）、独立域名 5（每站一个子域）。 */
const STATS = [
  { value: '5', unit: '个', label: '在线工具' },
  { value: '0', unit: '项', label: '后端依赖' },
  { value: '0', unit: '项', label: '数据上传' },
  { value: '5', unit: '个', label: '独立域名' },
]

const PRINCIPLES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Cpu,
    title: '纯本地计算',
    // 措辞只保留可核实的事实：五个子站 src/ 内 fetch/axios/XHR/sendBeacon/WebSocket
    // 命中均为 0 行，故「无后端调用、不上传服务器」成立。
    // 不要写「断网后仍可使用」—— 各站字体走 Google Fonts CDN，断网体验无保证。
    // 不要写「不留存」—— LLC 站的 DesignContext.tsx 会把设计参数/结果/建议/曲线
    // 写进 localStorage（实测 27 处命中），该说法对它不成立。
    desc: '全部运算在浏览器内完成；页面不含任何后端调用，输入数据不上传服务器。',
  },
  {
    icon: FunctionSquare,
    title: '公式可溯',
    desc: '每个工具都写明所用公式、假设与适用边界，结果可以手工复核，不做黑箱估算。',
  },
  {
    icon: Layers,
    title: '独立部署',
    desc: '每个工具是独立仓库、独立域名、独立构建产物，可单独迭代与回滚，互不牵连。',
  },
  {
    icon: ShieldCheck,
    title: '无需注册',
    desc: '纯静态站点，没有账号体系，也不埋点采集任何使用数据。',
  },
]

export default function App() {
  // 站点版本的运行时覆盖层：取到实时值就覆盖静态值，取不到就静默用静态值。
  // 详见 src/data/useLiveVersions.ts 与 deploy/nginx-entrance.conf 的端点说明。
  const liveVersions = useLiveVersions()

  return (
    <div id="top" className="flex min-h-screen flex-col bg-bg">
      <Header />

      <main className="flex-1">
        {/* ── 首屏 ── */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />

          {/* 大尺度品牌标记：把首页的六边形符号放大 20 余倍作为版面锚点，右侧出血。
              没有它，首屏右侧是一大片空底，整页会显得"平、小"。
              小屏隐藏，避免与正文抢位。stroke-width 用 1（600 视框），
              渲染到 560px 时约 0.9px，仍是细线。 */}
          <svg
            className="pointer-events-none absolute top-1/2 -right-32 hidden h-[560px] w-[560px] -translate-y-1/2 text-brand lg:block"
            viewBox="0 0 600 600"
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.09}
            aria-hidden="true"
          >
            <path d="M300 65 L502.5 182.5 L502.5 417.5 L300 535 L97.5 417.5 L97.5 182.5 Z" />
            <circle cx="300" cy="300" r="52" />
            <path d="M300 248 V158 M345 326 L428 374 M255 326 L172 374" />
          </svg>

          <div className="shell relative px-5 py-24 sm:px-8 sm:py-32 lg:px-10 lg:py-40">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 text-xs font-medium text-brand-light">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-light" />
              电源 · 光学 · 电气工程
            </span>

            <h1 className="mt-8 text-[2.75rem] leading-[1.06] font-bold tracking-[-0.03em] text-balance sm:text-6xl lg:text-7xl">
              一个入口，
              <br className="hidden sm:block" />
              <span className="text-gradient">直达全部工程工具</span>
            </h1>

            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-text-secondary sm:text-xl">
              这里汇集本人开发的电源、光学与电气工程在线工具。它们都是纯前端应用 ——
              打开即用、输入数据不出浏览器，公式与假设写在各自站内，结论可手工复核。
            </p>

            <div className="mt-11 flex flex-wrap items-center gap-3">
              <a
                href="#tools"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-light"
              >
                查看全部工具
                <ArrowDown className="h-4 w-4" strokeWidth={1.8} />
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border-light px-6 py-3.5 text-sm font-medium text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
              >
                <Github className="h-4 w-4" strokeWidth={1.8} />
                源码仓库
              </a>
            </div>
          </div>
        </section>

        {/* ── 数据带（整幅横带）──
            原先这四个数字被塞在首屏的一个 max-w-2xl 窄格里、字号仅 30px，
            本该是"气势担当"却成了配角。独立成整幅横带后，数字放到 48–60px，
            等分四列，才撑得起版面。 */}
        <section className="border-b border-border bg-surface/25">
          <dl className="shell grid grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="border-border px-5 py-10 sm:px-8 sm:py-12 lg:border-l lg:px-10 lg:first:border-l-0 lg:first:pl-0"
              >
                <dt className="font-mono text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
                  {s.value}
                  <span className="ml-1.5 text-base font-normal text-text-muted">{s.unit}</span>
                </dt>
                <dd className="mt-3 text-sm text-text-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── 工具集 ── */}
        <section
          id="tools"
          className="shell scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28 lg:px-10"
        >
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">工具集</h2>
              <p className="mt-3 text-base text-text-muted">
                点击卡片将在新标签页打开对应的工具站
              </p>
            </div>
            <span className="font-mono text-sm text-text-muted">
              {String(SITES.length).padStart(2, '0')} 个工具
            </span>
          </div>

          {/* 6 列网格：首 3 张各占 2 列（= 一行 3 张），末 2 张各占 3 列（= 一行 2 张）。
              5 个工具若按 3 列排，末行会空出一格、看着像"少了一个"；
              这样收口后末行刚好填满，像一份编目而不是没排完。
              规则写成 SITES.length % 3 === 2 判定，将来加到 6 个站时自动退回「两行各 3 张」。 */}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-6">
            {SITES.map((site, i) => {
              const isWideTail = SITES.length % 3 === 2 && i >= SITES.length - 2
              const liveVer = liveVersions[site.id]
              return (
                <SiteCard
                  key={site.id}
                  site={site}
                  index={i + 1}
                  version={liveVer ?? site.version}
                  live={!!liveVer}
                  className={isWideTail ? 'xl:col-span-3' : 'xl:col-span-2'}
                />
              )
            })}
          </div>
        </section>

        {/* ── 工程口径 ──
            刻意**去掉卡片盒子**，改为分隔线 + 大留白的编辑式排版。
            四个小方框会让版面显得琐碎、局促；去掉盒子、拉开间距反而更稳更大气。 */}
        <section id="principles" className="scroll-mt-24 border-t border-border bg-surface/40">
          <div className="shell px-5 py-20 sm:px-8 sm:py-28 lg:px-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">共同的工程口径</h2>
            <p className="mt-3 max-w-3xl text-base text-text-muted">
              这些工具面向工程估算，因此对「结果是怎么来的」和「在什么条件下不成立」有统一要求。
            </p>

            <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="border-t border-border-light pt-6">
                  <p.icon className="h-6 w-6 text-brand-light" strokeWidth={1.6} />
                  <h3 className="mt-5 text-base font-semibold text-text-primary">{p.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-text-secondary">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
