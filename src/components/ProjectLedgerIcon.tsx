import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 项目台账表格（project-ledger），2026-11-18 为「项目主数据管理系统」新增。
 *
 * 图形语言：沿用内网四张卡的标准工程图纸符号（LED 二极管 / 示波方波 /
 * DIP 拨码开关 / 多路旋转开关）。主数据台账在工程语境里就是一张明细表 ——
 * 外框 + 表头 + 编号列 + 三行记录，直接对应「项目编号 / 正式名称 / 别名 /
 * 机种系列 / 代表示意图」逐条登记这件事。
 *
 * 为什么不用 lucide 的 Database / Table2 现成图标：省一个组件，但图形语言
 * 会与其余四张自绘工程符号脱节（用户 2026-11-18 明确选了自绘成套方案）。
 *
 * 符号占比（bbox / 24×24 SVG 画布）：
 *   x 1.5..22.5（21）× y 2..22（20）= 420 / 576 ≈ 72.9%。
 *
 * 24px 可读性审查（吸取 DIP 拨码开关的教训）：
 *   · 不画小圆点，避免圆与同 x 的竖线相交后串成哑铃；
 *   · 编号列短横 x 3.5..6.25，列分隔竖线在 x 8，两者不相交；
 *   · 相邻横线的最小间距 4.5 单位（约 4.5px），大于 2× 描边 1.7px，不会粘成色块。
 *
 * 配色由 SiteCard 决定：该站 iconSolid 为 true 时底板是实心品牌色、
 * 前景是白色；本组件不写死颜色，stroke 取 currentColor 自动转白。
 *
 * 契约：forwardRef + LucideProps，直接注册进 ICONS，不放宽其类型。
 */
const ProjectLedgerIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, strokeWidth = 1.7, ...rest }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {/* 表体外框 + 表头分隔 + 编号列 + 两条行分隔 */}
      <path d="M1.5 2 H22.5 V22 H1.5 Z" />
      <path d="M1.5 7.5 H22.5" />
      <path d="M8 7.5 V22" />
      <path d="M1.5 13 H22.5 M1.5 17.5 H22.5" />
      {/* 表头两栏（编号 / 名称） */}
      <path d="M3.5 4.75 H6.25 M11 4.75 H19" />
      {/* 三行记录：编号列短横 + 名称列短横，均落在行区间中点，不碰分隔线 */}
      <path d="M3.5 10.25 H6.25 M11 10.25 H19" />
      <path d="M3.5 15.25 H6.25 M11 15.25 H19" />
      <path d="M3.5 19.75 H6.25 M11 19.75 H19" />
    </svg>
  ),
)

ProjectLedgerIcon.displayName = 'ProjectLedgerIcon'

export default ProjectLedgerIcon
