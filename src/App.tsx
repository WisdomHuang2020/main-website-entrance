import { Cpu, FunctionSquare, Layers, ShieldCheck, type LucideIcon } from 'lucide-react'
import Footer from './components/Footer'
import Header from './components/Header'
import SiteCard from './components/SiteCard'
import { SITES } from './data/sites'

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
  return (
    <div id="top" className="flex min-h-screen flex-col bg-bg">
      <Header />

      <main className="flex-1">
        {/* ── 首屏 ── */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand-light">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-light" />
              电源 · 光学 · 电气工程
            </span>

            <h1 className="mt-6 max-w-3xl text-4xl leading-[1.15] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              一个入口，
              <span className="text-gradient">直达全部工程工具</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
              这里汇集本人开发的电源、光学与电气工程在线工具。它们都是纯前端应用 ——
              打开即用、输入数据不出浏览器，公式与假设写在各自站内，结论可手工复核。
            </p>

            <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="font-mono text-3xl font-semibold tracking-tight text-text-primary">
                    {s.value}
                    <span className="ml-0.5 text-sm font-normal text-text-muted">{s.unit}</span>
                  </dt>
                  <dd className="mt-1 text-xs text-text-muted">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── 工具集 ── */}
        <section id="tools" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">工具集</h2>
              <p className="mt-1.5 text-sm text-text-muted">
                点击卡片将在新标签页打开对应的工具站
              </p>
            </div>
            <span className="font-mono text-xs text-text-muted">
              {String(SITES.length).padStart(2, '0')} 个工具
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {SITES.map((site) => (
              <SiteCard key={site.id} site={site} />
            ))}
          </div>
        </section>

        {/* ── 工程口径 ── */}
        <section
          id="principles"
          className="scroll-mt-20 border-t border-border bg-surface/40"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">共同的工程口径</h2>
            <p className="mt-1.5 max-w-2xl text-sm text-text-muted">
              这些工具面向工程估算，因此对「结果是怎么来的」和「在什么条件下不成立」有统一要求。
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="rounded-xl border border-border bg-surface/60 p-5">
                  <p.icon className="h-5 w-5 text-brand-light" strokeWidth={1.8} />
                  <h3 className="mt-3.5 text-sm font-semibold text-text-primary">{p.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">{p.desc}</p>
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
