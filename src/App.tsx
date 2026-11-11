import {
  ArrowDown,
  ArrowRight,
  Cpu,
  FunctionSquare,
  Layers,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import Footer from './components/Footer'
import Header from './components/Header'
import InternalPage from './components/InternalPage'
import AdminPage from './pages/AdminPage'
import SiteCard from './components/SiteCard'
import { INTERNAL_SITES, SITES } from './data/sites'
import { useLiveVersions } from './data/useLiveVersions'
import { useUnread } from './data/useUnread'
import { isAdminRoute, isInternalRoute, onSectionClick, useSectionRoute } from './lib/sectionRoute'

/** 内网页判定见 src/lib/sectionRoute.ts 的 isInternalRoute ——
 *  页头也要用它切换导航，放在 lib 里两边共用一份，避免两处 pathname 解析各写一遍。 */

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
 *    故四条全部限定在公开站范围内，标签也写明「公开」。
 *  ⑤ 2026-11-10 接入 english（第 9 站）后站点/域名数自动变 9，这里无需改；
 *    该站免注册、也没有计算输入，所以后两条「0 项」口径仍然成立。 */
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
    // 2026-11-10 站群加入外贸英语学习站后，四条口径必须区分「计算类工具」与「内容站」：
    // english 是纯静态内容页，既没有计算也没有公式，硬套「计算在本地」「公式可溯」就是当场说谎。
    // 故前两条限定主语，后两条（独立发布 / 免注册）对九站都成立，只把「构建产物」放宽为「发布」。
    desc: '计算类工具的输入参数只在浏览器内参与运算，不回传服务器；各站只有留言一项经服务端落库，且留言内容仅作者可见。',
  },
  {
    icon: FunctionSquare,
    title: '公式可溯',
    desc: '每个计算工具都写明公式、假设与适用边界，结果可手工复核；课程与语言学习站标注内容出处与筹备进度。',
  },
  {
    icon: Layers,
    title: '独立部署',
    desc: '每个站点是独立仓库、独立域名、独立发布，可单独迭代与回滚，互不牵连。',
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

  // 各站未读留言计数：为 0 或端点不可用时返回空对象，卡片上一片安静。
  // 详见 src/data/useUnread.ts 与 server/unread-aggregator/README.md。
  const unread = useUnread()

  // 干净 URL（/tools、/engineers）的深链定位与前进后退处理。
  // 详见 src/lib/sectionRoute.ts。
  useSectionRoute()

  // 后台（/admin）同样是独立一页，且自带完整布局（顶栏、退出、改密码），
  // 不复用站点的 Header/Footer —— 后台不该出现「工具与课程」这类导航，
  // 会让人误以为还在前台。
  if (isAdminRoute()) {
    return <AdminPage />
  }

  // 第二入口（/internal）是独立一页：内网系统需要账号登录，不与公众首页混排。
  // 用提前返回而不是把首页整段包进三元条件 —— 后者会让 Home 那几十行集体缩进两级，
  // diff 噪音大、日后 review 也难看清真正的改动。
  // ⚠️ 两个 hook 必须仍在上方无条件调用（组件内不能有条件 hook）。
  if (isInternalRoute()) {
    return (
      <div id="top" className="flex min-h-screen flex-col bg-bg">
        <Header />
        <main className="flex-1">
          <InternalPage liveVersions={liveVersions} />
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
                左边是第一入口（公开的工具与学习站），右边是第二入口（内网系统，点进 /internal 这一层）。
                原先右侧只有一片空底 + 放大六边形水印，宽屏上很空；现在两边各司其职。
                内网卡只做"入口"，不直接列内网站 —— 那些系统需要账号，不该出现在公众首屏。
                配套判断见 src/data/sites.ts：首页卡片墙只列 SITES，内网站在 /internal 列 INTERNAL_SITES。 */}
            {/* 双卡对称（2026-11-07，用户选 A 方案）。
                根因不是"没对齐"：左栏是**排版语言**（渐变巨标题 + 裸文字 + 按钮组），
                右栏是**组件语言**（描边卡片 + 列表 + 底栏），两套语言并排本身就割裂，
                上一版把上下沿对齐只是把两块摆正，消不掉语言差异。
                现在两栏**逐层同款**：
                  ① 卡外眉标：同字号/同字距/同 mb-5
                  ② 卡外大药丸：同尺寸/同内边距/同字重，连「前置脉冲点 + 词 + 后置渲染圆点」
                     的结构都逐字对应（只换词与强调色）—— 保留 11-02 那轮调过的圆点机制
                  ③ 卡片：同圆角/同描边样式/同底色/同内边距/同 flex-1 撑高
                  ④ 卡内：标题、描述、主体区、底栏四层同款
                强调色分工：第一入口 teal，第二入口 internal 蓝，同构但一眼可分辨。
                背景装饰（hero-glow / hero-grid / 出血六边形水印）按用户选择**全部保留、一个没动**。 */}
            <div className="grid gap-14 lg:grid-cols-2 lg:gap-14 xl:gap-16">
              {/* ── 第一入口：公开 ──
                  眉标按用户要求改成「白色 + 放大」，参照右下角「进入内网入口」按钮的
                  text-white / font-medium。原为 11px text-text-muted + 0.16em 大字距，
                  在 1440 大屏上几乎看不见。字号取 16px（比按钮的 14px 大一档，才像"标题"），
                  字距从 0.16em 收到 0.06em —— 大字配大字距会散。
                  **保留 font-mono**：「第一入口 · 公开」里的 U+00B7 位置随字体 fallback 漂移，
                  换字体家族会把 11-02 那轮调过的圆点问题重新引回来。 */}
              <div className="flex min-w-0 flex-col">
                <span className="mb-6 block font-mono text-base font-medium tracking-[0.06em] text-text-primary uppercase">
                  第一入口 · 公开
                </span>

                {/* 眉标药丸：词间分隔仍用**渲染出来的圆点（span + rounded-full）**，不用「·」字符 ——
                    U+00B7 的位置由字体决定，本站字体走 Google Fonts CDN，加载失败回退到系统字体时
                    点的位置会变；渲染圆点由 items-center 决定，与字体无关。
                    与右侧药丸逐字同构：脉冲点 → 词组（词 + 后置圆点）→ 末词。
                    2026-11-10 接入外贸英语学习站后补第四个领域「商务英语」——
                    原先只写「电源 · 光学 · 信息技术」，会把站群里第一个语言学习站排除在外。
                    用「商务英语」而非泛称「英语」：该站范围是外贸询盘/报价/订单/索赔邮件，
                    不是通用英语教学；与「信息技术」同为四字，药丸读起来也齐整。
                    ⚠️ 四词比原来三词宽约 80px：药丸是 `align-self: flex-start` 的 inline-flex，
                    宽度按内容最大值算，**不受父容器约束**；390px 窄屏下会把整栏撑破、
                    连页头和卡片一起横向溢出（2026-11-10 headless 实测）。故两处药丸都
                    加 `max-w-full` 兜底让 flex-wrap 真的能换行，两栏容器加 `min-w-0`
                    防止 grid 轨道被内容撑宽。
                    <640px 收字号到 text-base、组间距收到 gap-x-1：CDP 实测只收字号到
                    text-lg 时 360/390 仍会折成两行（pillH=78），再收一档才稳定单行（pillH≈46）。
                    右侧内网药丸同步改，维持「双卡逐层同款」。
                    ⚠️ 代价：复制这段文字只会得到「电源光学信息技术商务英语」，装饰性眉标可接受。 */}
                <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 self-start rounded-full border border-brand/30 bg-brand/10 px-5 py-2 text-base font-bold text-brand-light sm:gap-x-2 sm:text-2xl">
                  <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-brand-light" />
                  <span className="inline-flex items-center gap-[8px] whitespace-nowrap">
                    <span>电源</span>
                    <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-brand-light" aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-[8px] whitespace-nowrap">
                    <span>光学</span>
                    <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-brand-light" aria-hidden="true" />
                  </span>
                  <span className="inline-flex items-center gap-[8px] whitespace-nowrap">
                    <span>信息技术</span>
                    <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-brand-light" aria-hidden="true" />
                  </span>
                  <span className="whitespace-nowrap">商务英语</span>
                </span>

                {/* 标题按卡片内宽重算（2026-11-07「更大气」整体放大一档）：
                    xl 每栏 568px，减 p-10×2=80 → 488px 可用；
                    2026-11-10 文案改为「直达全部工具与学习站」10 字，40px 时约 400px，
                    比原来的「直达全部工程工具与课程」11 字更短，单行余量反而更大。
                    去掉「工程」是因为 english 是语言学习站，不是工程工具；用「学习站」
                    统称课程、培训页与英语站，与「工具」合起来正好覆盖当前 9 个公开站。
                    lg(1024) 每栏 444px、内容宽 364px，40px 会折行 ⇒ 该档仍用 text-3xl(30px)。
                    <br> 必须**始终生效**：原先写 hidden sm:block，窄屏把两句连成 16 字，
                    390px 下会断出孤儿行（实测）。窄屏 text-xl + 卡片 p-6，
                    10 字 × 20px ≈ 200px < 232px 可用宽（320px 视口），仍是整齐两行。 */}
                <div className="group mt-7 flex flex-1 flex-col rounded-2xl border border-brand/30 bg-surface/70 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-surface sm:p-10">
                  <h1 className="text-xl leading-[1.12] font-bold tracking-[-0.03em] sm:text-3xl xl:text-[2.5rem]">
                    一个入口
                    <br />
                    直达全部工具与学习站
                  </h1>

                  <p className="mt-5 text-[15px] leading-relaxed text-text-secondary sm:text-base">
                    这里汇集本人开发的电源与光学计算工具、建模与控制培训页、把站点从本机推到线上的信息技术实训课，以及一座外贸邮件英语学习站。
                  </p>

                  <div className="mt-5 text-[13px] leading-relaxed text-text-muted sm:mt-6 sm:text-sm">
                    <p>
                      计算类工具都是纯前端应用 —— 打开即用、输入参数不出浏览器，公式与假设写在各自站内，
                      结论可手工复核；课程与语言学习站则按站内说明标注出处与筹备进度。
                      发现哪里写错了，可直接在对应站点的「留言」里指出；
                      留言内容仅本人可见，入口站只公开提示各站是否有新留言。
                    </p>
                  </div>

                  <div className="flex-1" aria-hidden="true" />

                  <div className="mt-10 flex flex-col items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-mono text-xs text-text-muted">
                      {String(SITES.length).padStart(2, '0')} 个站点 · 免注册
                    </span>
                    <a
                      href="./tools"
                      onClick={(e) => onSectionClick(e, 'tools')}
                      className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-light sm:w-auto"
                    >
                      查看全部工具与学习站
                      <ArrowDown className="h-4 w-4" strokeWidth={1.8} />
                    </a>
                  </div>
                </div>
              </div>

              {/* ── 第二入口：内网 ──
                  与左栏逐层同款，只把词与强调色换成 internal 蓝。
                  整块是一个 <a>，点任意位置进 /internal；相对路径 `./internal` 不能写成
                  `/internal` —— Pages 子路径部署会 404（同 /tools 的教训）。
                  卡内 CTA 用 span 而非 a：外层已经是 a，嵌套链接是非法 HTML。 */}
              <div className="flex min-w-0 flex-col">
                <span className="mb-6 block font-mono text-base font-medium tracking-[0.06em] text-text-primary uppercase">
                  第二入口 · 内网
                </span>

                <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 self-start rounded-full border border-internal/35 bg-internal/10 px-5 py-2 text-base font-bold text-internal-light sm:gap-x-2 sm:text-2xl">
                  <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-internal-light" />
                  <span className="inline-flex items-center gap-[8px] whitespace-nowrap">
                    <span>内网</span>
                    <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-internal-light" aria-hidden="true" />
                  </span>
                  <span className="whitespace-nowrap">需登录</span>
                </span>

                <a
                  href="./internal"
                  className="group mt-7 flex flex-1 flex-col rounded-2xl border border-internal/35 bg-surface/70 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-internal/60 hover:bg-surface sm:p-10"
                >
                  <h2 className="text-xl leading-[1.12] font-bold tracking-[-0.03em] sm:text-3xl xl:text-[2.5rem]">
                    团队内部系统
                  </h2>

                  <p className="mt-5 text-[15px] leading-relaxed text-text-secondary sm:text-base">
                    需要账号与密码登录，不对公众开放，因此不列在下面的公开清单里。
                  </p>

                  {/* 每行带副标题（取 sites.json 的 subtitle），是真实数据不是凑字数。
                      字号跟着整体上移一档：列表标题 16px、副标题 14px，
                      卡片被撑到与左卡同高后，右卡中部才不会显空。 */}
                  <ul className="mt-6 space-y-5">
                    {INTERNAL_SITES.map((s) => (
                      <li key={s.id}>
                        <div className="flex items-center gap-2.5 text-sm font-medium text-text-primary sm:text-base">
                          <span className="h-1 w-1 shrink-0 rounded-full bg-internal-light" aria-hidden="true" />
                          {s.name}
                        </div>
                        <p className="mt-1.5 pl-[14px] text-[13px] leading-relaxed text-text-muted sm:text-sm">
                          {s.subtitle}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-6 text-[13px] leading-relaxed text-text-muted sm:text-sm">
                    点进去会先跳到登录页。
                  </p>

                  <div className="flex-1" aria-hidden="true" />

                  <div className="mt-10 flex flex-col items-stretch gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-mono text-xs text-text-muted">
                      {String(INTERNAL_SITES.length).padStart(2, '0')} 个系统 · 需登录
                    </span>
                    <span className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-internal px-5 py-2.5 text-sm font-medium text-white sm:w-auto">
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
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">工具与学习站</h2>
              <p className="mt-3 text-base text-text-muted">
                工程计算工具、实训课程与外贸英语学习站都收在这里，点击卡片将在新标签页打开对应站点；
                需要账号登录的内部系统在首屏「第二入口」里
              </p>
            </div>
            <span className="font-mono text-sm text-text-muted">
              {String(SITES.length).padStart(2, '0')} 个站点
            </span>
          </div>

          {/* 6 列网格，跨度按站点数自适应：
              数量 % 3 === 2 时（如 5 站）首 3 张各占 2 列、末 2 张各占 3 列，
              否则末行会空出一格、看着像"少了一个"；
              数量能被 3 整除时全部各占 2 列、每 3 张一行 —— 2026-10-31 加入 web-training
              后为 6 站（两行），2026-11-10 加入 english 后为 9 站（三行），都命中这条分支。 */}
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
                  unread={unread[site.id] ?? 0}
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
              计算类工具面向工程估算，对「结果是怎么来的」和「在什么条件下不成立」有统一要求；
              课程与语言学习站按站内说明标注出处与筹备进度。九站的发布与开放方式一致。
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
