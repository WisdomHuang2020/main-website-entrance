import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 示波方波（V-N2），2026-11-12 用户为「评鉴测试报告系统」选定。
 *
 * 图形语言：与 smartbin 的 LED 二极管符号同族 —— 标准工程图纸里的线框符号，
 * 不是界面图标库里的「文件 / 清单 / 勾」隐喻，也不是任何实物外壳。
 * 屏框 + 零线 + 方波，对应 LED 灯具评鉴里的电参数实测波形。
 *
 * 为什么不用原先的 FileText：它只表达「有一份文档」，不表达「按站内标准
 * 实测并判定」；本轮另两组候选（通用 UI 图标、抽象几何）已由用户整体否决。
 *
 * 符号占比（口径：bbox / 24×24 SVG 画布，与 smartbin H1 一致）：
 *   x 1.5..22.5（21）× y 2.5..21.5（19）= 399 / 576 ≈ 69.3%。
 *   实拍白色像素 bbox 会因 1.7 描边与抗锯齿略外扩。
 *   注意口径是 SVG 画布，不是 48px 卡片底板：底板里固定放 24px SVG，
 *   符号再撑满也只能占底板的 25%。
 *
 * 配色由 SiteCard 决定：该站 iconSolid 为 true 时底板是实心品牌色、
 * 前景是白色；本组件不写死颜色，stroke 取 currentColor 自动转白。
 *
 * 契约：实现 LucideIcon 的完整签名（forwardRef + LucideProps），
 * 因此可直接注册进 sites.ts 的 ICONS，不需要放宽 ICONS 的类型。
 */
const SquareWaveIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <path d="M1.5 2.5 H22.5 V21.5 H1.5 Z" />
      <path d="M1.5 12 H22.5" />
      <path d="M3.5 17.5 H8 V6.5 H13 V17.5 H18 V6.5 H21" />
    </svg>
  ),
)

SquareWaveIcon.displayName = 'SquareWaveIcon'

export default SquareWaveIcon
