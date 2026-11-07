import {
  ArrowDown,
  ArrowRight,
  Cpu,
  FunctionSquare,
  Github,
  Layers,
  Lock,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import Footer from './components/Footer'
import Header from './components/Header'
import InternalPage from './components/InternalPage'
import SiteCard from './components/SiteCard'
import { INTERNAL_SITES, SITES } from './data/sites'
import { useLiveVersions } from './data/useLiveVersions'
import { onSectionClick, useSectionRoute } from './lib/sectionRoute'

const REPO_URL = 'https://github.com/WisdomHuang2020/main-website-entrance'

/** 当前是否停留在「第二入口」内网页（`/internal`）。
 *  只取路径最后一段，兼容 Pages 子路径部署（/repo/internal）。
 *  本站没有路由库，靠这一个判断在同一份 index.html 上切换两个视图。 */
function isInternalPage(): boolean {
  const segs = window.location.pathname.split('/').filter(Boolean)
  return segs[segs.length - 1] === 'internal'
}

/** 首屏四个数字。全部为可核实事实，不写修辞：
 *  ① 站点数与独立域名数取 SITES.length 而**不硬编码** —— 加一个子站却忘了同步这里，
 *    首屏就会挂着一个当场撒谎的数字（2026-10-31 接入 web-training 时正是这个坑）。
 *  ② 2026-11-02 五个子站接入留言板后，原先的「后端依赖 0 项」「数据上传 0 项」
 *    **已不成立**，必须换掉，否则首屏当场说谎。判据：各站 nginx 均新增
 *    `location ^~ /api/` 反代到 127.0.0.1:8792，服务端确有 SQLite 落库。
 *    改为「注册门槛 0 项」「计算数据上传 0 项」——这两条仍然可核实：
 *      · 全部工具匿名可用，没有任何账号体系拦在计算功能前面；
 *      · 计算/设计的输入参数只在浏览器内参与运算，不发往服务器
 *        （留言是唯一例外，且只存用户主动提交的文字，见 PRINCIPLES）。
 *  ③ 不要改回「后端依赖 0」这类绝对表述。它曾经是真的，现在是假的；
 *    文案的可信度靠的是每条都经得起核对，不是数字好看。
 *  ④ 2026-11-07 接入两个内网系统（validation-test / psu-model）后，口径收窄到**公开站**：
 *    它们需要账号登录，若继续用「在线站点 6」笼统说法，就和「使用门槛 0 项」当场打架。
 *    故四条全部限定在公开站范围内，标签也写明「公开」。 */
const STATS = [
  { value: String(SITES.length), unit: '个', label: '公开站点' },
  { value: String(SITES.length), unit: '个', label: '公开域名' },
  { value: '0', unit: '项', label: '使用门槛' },
  { value: '0', unit: '项', label: '计算数据上传' },
]

const PRINCIPLES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Cpu,
    title: '计算在本地',
    // 2026-11-02 改写：五个子站接入留言板后，「页面不含任何后端调用」这句不再成立
    // （/api/feedback、/api/admin/* 都是真实的后端调用）。但**计算本身**仍然全在前端：
    // 输入参数只参与浏览器内运算，不发往服务器。这两件事必须分开说，
    // 否则要么撒谎（说无后端），要么连真话一起丢掉（说数据都上传）。
    // 仍需避免的表述：「断网后仍可使用」—— 字体走 Google Fonts CDN，断网体验无保证；
    // 「不留存」—— LLC 站会把设计参数写进 localStorage（实测 27 处）。
    desc: '计算与设计全部在浏览器内完成，输入参数不回传服务器；各站只有留言一项经服务端落库，且仅作者可见。',
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
    title: '免注册可用',
    // 原文案写「纯静态站点，没有账号体系」—— 留言板后台确实有账号，
    // 但它只属于作者一人，读者侧仍然零门槛。按读者视角如实描述。
    // 2026-11-07：接入两个内网系统后，「使用全部工具不需要注册」不再成立 ——
    // 那两个确实要账号。故限定为「公开工具」。
    desc: '公开工具全部免注册使用，也不埋点采集使用数据；需账号的只有团队内部系统与作者本人的后台。',
  },
]

export default function App() {
  // 站点版本的运行时覆盖层：取到实时值就覆盖静态值，取不到就静默用静态值。
  // 详见 src/data/useLiveVersions.ts 与 deploy/nginx-entrance.conf 的端点说明。
  const liveVersions = useLiveVersions()

  // 干净 URL（/tools、/engineers）的深链定位与前进后退处理。
  // 详见 src/lib/sectionRoute.ts。
  useSectionRoute()

  // 第二入口（/internal）是独立一页：内网系统需要账号登录，不与公众首页混排。
  // 用提前返回而不是把首页整段包进三元条件 —— 后者会让 Home 那几十行集体缩进两级，
  // diff 噪音大、日后 review 也难看清真正的改动。
  // ⚠️ 两个 hook 必须仍在上方无条件调用（组件内不能有条件 hook）。
  if (isInternalPage()) {
    return (
      <div id="top" className="flex min-h-screen flex-col bg-bg">
        <Header />
        <main className="flex-1">
          <InternalPage />
        </main>
        <Footer />
      </div>
    )
  }

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
            {/* 首屏改为**左右两个入口各占一半**（2026-11-07）。
                左边是第一入口（公开的工具与课程），右边是第二入口（内网系统，点进 /internal 这一层）。
                原先右侧只有一片空底 + 放大六边形水印，宽屏上很空；现在两边各司其职。
                内网卡只做"入口"，不直接列内网站 —— 那些系统需要账号，不该出现在公众首屏。
                配套判断见 src/data/sites.ts：首页卡片墙只列 SITES，内网站在 /internal 列 INTERNAL_SITES。 */}
            <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-12">
              {/* ── 第一入口：公开 ── */}
              <div>
                <span className="mb-5 block font-mono text-[11px] tracking-[0.16em] text-text-muted uppercase">
                  第一入口 · 公开
                </span>

                {/* 眉标：字号 12px(text-xs) → 24px(text-2xl) 即放大一倍，字重 500 → 700 加粗。
                    内边距与小圆点按同比例放大 —— 24px 的字配 6px 的点、6px 的内边距会显得破。

                    词间分隔用**渲染出来的圆点（span + rounded-full）**，不再用「·」字符：
                      · 字符版本的位置**由字体决定** —— U+00B7 在 Inter 里居 x 字高中线，
                        而汉字有独立的视觉中心，两者只能近似对齐；更麻烦的是本站字体走 Google Fonts CDN，
                        在字体加载失败/被拦的机器上会回退到系统字体，点的位置随之改变（同一份代码两种观感）。
                      · 渲染圆点由 `items-center` 决定垂直位置，**与字体无关**，
                        且与左侧那个脉冲指示点落在同一条中线上（2026-11-02 实测：两者中心差 0.33px）。
                    间距/尺寸按用户给的参考图定：间隙 ≈8–9px、点径 5px（参考图换算到 24px 后为 8.2/8.9px 与 4.8px）。
                    ⚠️ 代价：分隔符不再是文本字符，复制这段文字只会得到「电源光学信息技术」。
                    对一个装饰性眉标可以接受；若日后要求可复制的分隔符，需换回字符版并接受字体差异。 */}
                <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-brand/30 bg-brand/10 px-5 py-2 text-2xl font-bold text-brand-light">
                  <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-brand-light" />
                  {/* 「词 + 后置圆点」各成一组（nowrap），折行只发生在组与组之间
                      —— 这样点永远不会被甩到下一行的行首，也不会把词劈开。 */}
                  <span className="inline-flex items-center gap-[8px] whitespace-nowrap">
                    <span>电源</span>
                    <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-brand-light" aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-[8px] whitespace-nowrap">
                    <span>光学</span>
                    <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-brand-light" aria-hidden="true" />
                  </span>
                  <span className="whitespace-nowrap">信息技术</span>
                </span>

                {/* 字号随分栏收小，且**按栏宽算过**：两栏后每栏约 448px(lg) / 576px(xl)。
                    「直达全部工程工具与课程」11 个字，44px 时 484px、48px 时 528px —— 都能在
                    xl 的 576px 栏里单行放下；lg 的 448px 栏需要 ≤40px，故 lg 段取 2.5rem。
                    原先单列时用的 72px 放到两栏里会折成三行、末尾「课程」还成了孤儿行。 */}
                <h1 className="mt-8 text-[2.1rem] leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-4xl lg:text-[2.5rem] xl:text-5xl">
                  一个入口
                  <br className="hidden sm:block" />
                  <span className="text-gradient">直达全部工程工具与课程</span>
                </h1>

                <p className="mt-7 max-w-2xl text-lg leading-relaxed text-text-secondary">
                  这里汇集本人开发的电源与光学在线工具，外加一套把站点从本机推到线上的信息技术实训课。
                  工具都是纯前端应用 —— 打开即用、输入参数不出浏览器，公式与假设写在各自站内，结论可手工复核。
                  发现哪里算错了，可直接在对应站点的「留言」里指出，留言只有本人能看到。
                </p>

                <div className="mt-10 flex flex-wrap items-center gap-3">
                  <a
                    href="./tools"
                    onClick={(e) => onSectionClick(e, 'tools')}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-light"
                  >
                    查看全部工具与课程
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

              {/* ── 第二入口：内网 ──
                  整块是一个 <a>，点任意位置进 /internal。用相对路径 `./internal`：
                  Pages 子路径部署时写成 `/internal` 会 404（同 /tools 的教训）。 */}
              <div>
                <a
                  href="./internal"
                  className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-surface/70 p-8 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-surface"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand-light">
                        <Lock className="h-4 w-4" strokeWidth={1.9} />
                      </span>
                      <span className="font-mono text-[11px] tracking-[0.16em] text-text-muted uppercase">
                        第二入口 · 内网
                      </span>
                    </div>

                    <h2 className="mt-6 text-2xl font-semibold tracking-tight text-text-primary">
                      团队内部系统
                    </h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
                      需要账号与密码登录，不对公众开放，因此不列在下面的公开清单里。
                    </p>

                    <ul className="mt-6 space-y-2.5">
                      {INTERNAL_SITES.map((s) => (
                        <li key={s.id} className="flex items-center gap-2.5 text-sm text-text-secondary">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-text-muted" aria-hidden="true" />
                          {s.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
                    <span className="font-mono text-xs text-text-muted">
                      {String(INTERNAL_SITES.length).padStart(2, '0')} 个系统 · 需登录
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-light">
                      进入内网入口
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        strokeWidth={1.8}
                      />
                    </span>
                  </div>
                </a>
              </div>
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
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">工具与课程</h2>
              <p className="mt-3 text-base text-text-muted">
                点击卡片将在新标签页打开对应站点；需要账号登录的内部系统在首屏「第二入口」里
              </p>
            </div>
            <span className="font-mono text-sm text-text-muted">
              {String(SITES.length).padStart(2, '0')} 个站点
            </span>
          </div>

          {/* 6 列网格，跨度按站点数自适应：
              数量 % 3 === 2 时（如 5 站）首 3 张各占 2 列、末 2 张各占 3 列，
              否则末行会空出一格、看着像"少了一个"；
              数量能被 3 整除时（2026-10-31 加入 web-training 后为 6 站）全部各占 2 列，
              正好两行各 3 张 —— 早先注释里预留的"加到 6 个站自动退回两行各 3 张"已生效。 */}
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
