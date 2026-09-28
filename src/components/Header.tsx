import { Github } from 'lucide-react'
import BrandMark from './BrandMark'

const NAV = [
  { href: '#tools', label: '工具集' },
  { href: '#principles', label: '工程口径' },
]

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5 text-text-primary transition-colors hover:text-brand-light">
          <BrandMark className="h-6 w-6 text-brand-light" />
          <span className="text-[15px] font-bold tracking-tight">Power Knowledge</span>
          {/* 版本号显示点之一（另一处在页脚）。两处共用 __APP_VERSION__ 同一常量，
              由 scripts/verify-version.mjs 断言不得各自硬编码。
              app-version 为核验钩子：线上可用 querySelectorAll('.app-version') 直接读到版本。 */}
          <span className="app-version rounded border border-brand/30 bg-brand-dark/40 px-1.5 py-0.5 font-mono text-[10px] leading-none font-semibold text-brand-light">
            v{__APP_VERSION__}
          </span>
        </a>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
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
