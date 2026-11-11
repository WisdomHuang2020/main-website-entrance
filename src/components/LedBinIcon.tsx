import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 贴片 LED + 封装内分档（E4 风格），2026-11-11 用户从四种草稿中选定。
 *
 * 为什么是自定义 SVG：已装的 lucide-react 没有 LED / diode 实物图标，
 * 最接近的 lightbulb / microchip 都不是灯珠本体。
 * 本组件实现 LucideIcon 的完整契约（forwardRef + LucideProps + currentColor），
 * 因此可直接注册进 sites.ts 的 ICONS，不需要放宽 ICONS 的类型。
 *
 * 图形语义：外框 = SMD 封装；内框 = 荧光胶区；2×2 网格 + 一个实心点 = 分 BIN 档位；
 * 封装左右短横线 = 焊盘；底部三点 = 电压/色度/亮度三个分档维度；顶部竖线 = 发光。
 * 24×24 线性笔触、strokeWidth 1.7、圆角端点，与站内其余 lucide 图标同款。
 */
const LedBinIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <rect x="3.5" y="6" width="17" height="10" rx="2" />
      <rect x="8" y="8" width="8" height="6" rx="1" />
      <path d="M12 8 v6 M8 11 h8" />
      <circle cx="10" cy="9.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M2 9 h1.5 M2 13 h1.5 M20.5 9 h1.5 M20.5 13 h1.5" />
      <path d="M12 2 v1.8" />
      <circle cx="7" cy="20" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
)

LedBinIcon.displayName = 'LedBinIcon'

export default LedBinIcon
