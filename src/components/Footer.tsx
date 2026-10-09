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
          {/* 备案信息：工信部 ICP 与公安部联网备案，法规均要求网站底部展示并链接至对应官网。
              两个号并排一行、窄屏自动换行，置于页脚左下角
              —— 桌面端落在左列底部，移动端随左列自然下移。 */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted transition-colors hover:text-text-secondary"
            >
              苏ICP备2026073104号-1
            </a>
            {/* 公安备案：规定要求「备案图标 + 备案号 + 链接至全国互联网安全管理服务平台」三者齐备。
                图标是官方警徽图，原始 36×40（非正方形），故用 h-4 + w-auto 等比缩放
                —— 写成 h-4 w-4 会把它横向拉伸约 11%。
                alt 留空：紧随其后的文字已表达同样含义，重复朗读反而啰嗦（装饰性图标的正确用法）。 */}
            <a
              href="https://beian.mps.gov.cn/#/query/webSearch?code=32021402005238"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-secondary"
            >
              <img
                src="./beian-gongan.png"
                alt=""
                width={36}
                height={40}
                className="h-4 w-auto shrink-0"
              />
              苏公网安备32021402005238号
            </a>
          </div>
        </div>

        <div className="text-xs text-text-muted md:text-right">
          <p className="font-mono">power-knowledge.tech</p>
          <p className="mt-1.5">
            <a
              href="https://wisdomhuang2020.github.io/main-website-entrance/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary underline decoration-border-light underline-offset-2 transition-colors hover:text-brand-light"
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
