import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 项目主数据图标（project-ledger），2026-11-18 为「项目主数据管理系统」新增。
 *
 * 图形沿革（改名与改图都别凭猜测复原）：
 *   · 首版是「项目台账表格」外框 + 表头 + 编号列 + 三行记录；当日 1.8.19 上线。
 *   · 同日用户看了附件《项目主数据管理系统_favicon候选方案.html》后改选 A 方案
 *     「数据库层叠」：顶椭圆 + 两侧壁 + 两条向下凸的分层弧，语义是「主数据分层归档」。
 *     当前图形即 A 方案，**不是**最初的台账表格。
 *   · 组件名与 ICONS key 仍叫 project-ledger（站点语义仍是项目主数据台账），
 *     没有重命名 —— 改名要牵动 sites.ts / sites.json / README 三处 key，无实际收益。
 *
 * 附件原图是 72×72 坐标系（symA：椭圆 rx19 ry7，弦 x17..55），这里按门户的
 * 24×24 契约重绘，不是简单缩放：
 *   · 顶椭圆 cx12 cy4.6 rx9 ry2.6；
 *   · 侧壁与底弧 M3 4.6 V19.4 A9 2.6 0 0 0 21 19.4 V4.6；
 *   · 两条分层弧弦在 y10.4 / y15.4，均用 sweep=0 向下凸，与附件方向一致。
 *
 * 符号占比（bbox / 24×24 SVG 画布）：
 *   x 3..21（18）× y 2..22（20）= 360 / 576 ≈ 62.5%。
 *
 * 24px 可读性审查（吸取 DIP 拨码开关串珠的教训）：
 *   · 相邻曲线的垂直间距 ≥ 4 单位（端点处 4.6 / 5 / 5.8），
 *     远大于描边 1.7px，不会粘成色块；
 *   · ry 取 2.6 而非附件比例的 3.3 —— 20 单位高度内放四条下垂弧，ry 再大
 *     底弧就会出界；实拍确认椭圆内部未填实。
 *
 * 配色由 SiteCard 决定：该站 iconSolid 为 true 时底板是实心品牌色（#4338ca）、
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
      {/* 顶椭圆 + 两侧壁 + 向下凸的底面弧 */}
      <ellipse cx="12" cy="4.6" rx="9" ry="2.6" />
      <path d="M3 4.6 V19.4 A9 2.6 0 0 0 21 19.4 V4.6" />
      {/* 两条分层弧：sweep=0 与附件 A 同向，向下凸 */}
      <path d="M3 10.4 A9 2.6 0 0 0 21 10.4" />
      <path d="M3 15.4 A9 2.6 0 0 0 21 15.4" />
    </svg>
  ),
)

ProjectLedgerIcon.displayName = 'ProjectLedgerIcon'

export default ProjectLedgerIcon
