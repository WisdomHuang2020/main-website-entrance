import BrandMark from './BrandMark'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-5 w-5 text-brand-light" />
            <span className="text-sm font-semibold tracking-tight">Power Knowledge</span>
            <span className="app-version font-mono text-[10px] text-text-muted">
              v{__APP_VERSION__}
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            本页仅作入口导航。各工具的计算口径、假设、适用边界与免责声明，以对应站点内的说明为准
            —— 本站不对任何第三方引用或据此作出的工程决策负责。
          </p>
        </div>

        <div className="text-xs text-text-muted md:text-right">
          <p className="font-mono">power-knowledge.tech</p>
          <p className="mt-1.5">
            兜底通道：
            <a
              href="https://wisdomhuang2020.github.io/main-website-entrance/"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 text-text-secondary underline decoration-border-light underline-offset-2 transition-colors hover:text-brand-light"
            >
              GitHub Pages
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
