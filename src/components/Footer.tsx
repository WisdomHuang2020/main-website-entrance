import BrandMark from './BrandMark'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="shell flex flex-col gap-8 px-5 py-12 sm:px-8 sm:py-14 lg:px-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-5 w-5 text-brand-light" />
            <span className="text-sm font-semibold tracking-tight">Power Knowledge</span>
            <span className="app-version font-mono text-[10px] text-text-muted">
              v{__APP_VERSION__}
            </span>
          </div>
          {/* ICP 备案号：工信部要求网站底部展示并链接至工信部官网。
              置于页脚左下角 —— 桌面端落在左列底部，移动端随左列自然下移。 */}
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-text-muted transition-colors hover:text-text-secondary"
          >
            苏ICP备2026073104号
          </a>
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

      {/* 免责声明：分「工程决策」与「知识产权」两段，与站群其余站点保持同一文本。 */}
      <div className="shell px-5 pb-12 sm:px-8 lg:px-10">
        <div className="border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-text-muted">
            <span className="font-medium text-text-secondary">免责声明：</span>
            本站为个人非商业性技术分享。本站及所链接的全部工具，其结果均基于公开理论模型
            与解析/半解析近似，仅供工程估算与学习研究参考，不构成设计保证，亦不替代器件
            数据手册、实测波形、仿真与第三方专业复核。任何主体引用本站内容或据此作出的
            工程决策，风险与责任由该主体自行承担；因使用本站内容所产生的间接损失，
            本站不予承担。
          </p>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            站内图表、公式推导与文字内容为作者原创或基于公开资料整理，著作权归作者所有；
            文中提及的软件、标准、商标与厂商名称，权利均归各自权利人所有，仅作技术说明引用，
            不代表任何隶属、赞助或背书关系。
          </p>
        </div>
      </div>
    </footer>
  )
}
