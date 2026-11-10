import { ArrowLeft } from 'lucide-react'
import BrandMark from './BrandMark'
import ThemeSwitcher from './ThemeSwitcher'
import { SECTION_LINKS, isInternalRoute, onHomeClick, onSectionClick } from '../lib/sectionRoute'

export default function Header() {
  /**
   * 内网页（/internal）的导航与首页不同：
   * 「工具与课程」「工程口径」是**首页的区块锚点**，挂在第二层页面上会出现两个问题 ——
   * ① 看着像当前页的目录，点下去却是"离开本页 + 滚到首页某一段"；
   * ② 与页面里已有的「返回入口」语义打架，用户不知道哪个才是"上一级"。
   * 所以内网页只留一个明确的「返回总入口」（2026-11-07 按用户要求由「返回入口」改名，
   * 强调回到的是站群总入口这一层，而不是随便某个上一级）。
   * 2026-11-10 按用户要求移除 GitHub 图标链接，首页与内网页都不再显示。
   * ⚠️ 进出内网页都是整页跳转（<a href>），Header 会重新挂载，渲染时读一次 pathname 即可。
   */
  const internal = isInternalRoute()
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur">
      <div className="shell flex h-16 items-center justify-between gap-4 px-5 sm:h-20 sm:px-8 lg:px-10">
        <a
          href="./"
          onClick={onHomeClick}
          className="flex shrink-0 items-center gap-3 text-text-primary transition-colors hover:text-brand-light"
        >
          <BrandMark className="h-7 w-7 shrink-0 text-brand-light" />
          {/* 品牌文字与版本徽标在 <sm 隐藏。
              起因（2026-10-31 实测）：品牌名由「Power Knowledge」（15 字符）改为更长的
              「Know-How·Tools·Skills」（21 字符、宽 172px）后，页头在窄屏放不下 ——
              最早那一版用 `&` 连接（21 字符、183px）时，360px 需 413px、390px 也超视口，
              导航项还被挤成**每个字一行**（「工具与课程」折 5 行、高 116px > 页头固定 65px）。
              改用点号只窄了 11px，不足以让它回到窄屏页头，故隐藏策略保留。
              2026-11-07 品牌名再加一个词（`·Systems`，21 → 29 字符、宽 172 → 约 237px），
              sm(640) 这一档的余量被吃光，故把品牌文字与版本徽标的显隐断点从 sm 提到 md
              —— 640–767px 只留六边形标记，导航不再被挤压。
              窄屏留六边形标记即足以识别品牌（标记本身就是品牌符号），版本号在页脚仍有一处。
              ⚠️ 用 CSS 隐藏而非条件渲染：`.app-version` 必须留在 DOM 里，
              scripts/verify-version.mjs 的「显示点 ≥ 2 处」断言依赖它存在。 */}
          <span className="hidden text-base font-bold tracking-tight md:inline">
            Know-How·Tools·Skills·Systems
          </span>
          {/* 版本号显示点之一（另一处在页脚）。两处共用 __APP_VERSION__ 同一常量，
              由 scripts/verify-version.mjs 断言不得各自硬编码。
              app-version 为核验钩子：线上可用 querySelectorAll('.app-version') 直接读到版本。 */}
          <span className="app-version hidden rounded border border-brand/30 bg-brand-dark/40 px-1.5 py-0.5 font-mono text-[10px] leading-none font-semibold text-brand-light md:inline">
            v{__APP_VERSION__}
          </span>
        </a>

        <nav className="flex shrink-0 items-center gap-1">
          {internal ? (
            <a
              href="./"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary sm:px-4"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              返回总入口
            </a>
          ) : (
            SECTION_LINKS.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => onSectionClick(e, item.id)}
                // whitespace-nowrap：CJK 默认可在任意字间断行，不加这条会被挤成竖排单字堆
                // （2026-10-31 实测 390px 下「工具与课程」折 5 行）。宁可横向挤，
                // 也不能竖排——竖排会溢出页头高度。
                className="rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary sm:px-4"
              >
                {item.label}
              </a>
            ))
          )}
          {/* 页面风格切换器：与导航项同一视觉层级，放在导航末尾。
              内网页也保留 —— 换肤是全站行为，不该因为进了第二层就消失。
              2026-11-10 按用户要求去掉了原本紧跟其后的 GitHub 图标链接。 */}
          <ThemeSwitcher />
        </nav>
      </div>
    </header>
  )
}
