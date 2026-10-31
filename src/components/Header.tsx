import { Github } from 'lucide-react'
import BrandMark from './BrandMark'
import { SECTION_LINKS, onHomeClick, onSectionClick } from '../lib/sectionRoute'

export default function Header() {
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
              为什么：2026-10-31 品牌名由「Power Knowledge」（15 字符）改为
              「Know-How&Tools&Skills」（20 字符，宽 183px）后，页头内容在 360px 下需 413px、
              390px 下也超过视口；同时导航项被挤成**每个字一行**（「工具与课程」折 5 行、
              高 116px），而页头高度固定 65px ⇒ 文字溢出页头外。
              窄屏留六边形标记即足以识别品牌（标记本身就是品牌符号），版本号在页脚仍有一处。
              ⚠️ 用 CSS 隐藏而非条件渲染：`.app-version` 必须留在 DOM 里，
              scripts/verify-version.mjs 的「显示点 ≥ 2 处」断言依赖它存在。 */}
          <span className="hidden text-base font-bold tracking-tight sm:inline">
            Know-How&Tools&Skills
          </span>
          {/* 版本号显示点之一（另一处在页脚）。两处共用 __APP_VERSION__ 同一常量，
              由 scripts/verify-version.mjs 断言不得各自硬编码。
              app-version 为核验钩子：线上可用 querySelectorAll('.app-version') 直接读到版本。 */}
          <span className="app-version hidden rounded border border-brand/30 bg-brand-dark/40 px-1.5 py-0.5 font-mono text-[10px] leading-none font-semibold text-brand-light sm:inline">
            v{__APP_VERSION__}
          </span>
        </a>

        <nav className="flex shrink-0 items-center gap-1">
          {SECTION_LINKS.map((item) => (
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
          ))}
          <a
            href="https://github.com/WisdomHuang2020/main-website-entrance"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="本站源码仓库"
            className="ml-1 rounded-md p-2 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            <Github className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </header>
  )
}
