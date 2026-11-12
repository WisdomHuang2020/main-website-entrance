import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 多路旋转开关（I-N2），2026-11-12 用户为「IO 团队内部站点入口」选定。
 *
 * 图形语言：与 smartbin 的 LED 二极管符号同族 —— 标准电路图符号。
 * 一个公共触点 + 四个选择触点 + 一根旋臂，准确表达
 * 「一次登录，从同一入口分发到多个内部站点」，比原先的 LayoutGrid
 * 九宫格（只表达「有很多格子」）语义强得多。
 *
 * 旋臂终点 (18, 4.8) 与第一个触点圆 (19, 4) 相切，是开关接通的标准画法；
 * 不要把它延长穿过圆，否则会变成「指向」而不是「接通」。
 *
 * 符号占比（bbox / 24×24 SVG 画布）：
 *   x 1.5..22.2（20.7）× y 2.8..21.2（18.4）≈ 381 / 576 ≈ 66.1%。
 *
 * ⚠️ 24px 下的已知风险：四个 r=1.2 的选择触点靠得较近（y 9.5 / 14.5），
 * 描边 1.7 时可能相邻粘连。上线前须本地放大实拍确认。
 *
 * 配色由 SiteCard 决定：该站 iconSolid 为 true 时底板是实心品牌色、
 * 前景是白色；本组件不写死颜色，stroke 取 currentColor 自动转白。
 *
 * 契约：forwardRef + LucideProps，直接注册进 ICONS，不放宽其类型。
 */
const RotarySwitchIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <circle cx="5.5" cy="12" r="1.6" />
      <circle cx="19" cy="4" r="1.2" />
      <circle cx="21" cy="9.5" r="1.2" />
      <circle cx="21" cy="14.5" r="1.2" />
      <circle cx="19" cy="20" r="1.2" />
      <path d="M1.5 12 H3.9" />
      <path d="M6.9 11.3 L18 4.8" />
    </svg>
  ),
)

RotarySwitchIcon.displayName = 'RotarySwitchIcon'

export default RotarySwitchIcon
