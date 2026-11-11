import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 2835 SMD LED 正视（F2 阴极倒角风格），2026-11-11 用户从四种 2835 草案中选定。
 *
 * 为什么是自定义 SVG：已装的 lucide-react 没有 LED / diode 实物图标，
 * 最接近的 lightbulb / microchip 都不是灯珠本体。
 * 本组件实现 LucideIcon 的完整契约（forwardRef + LucideProps + currentColor），
 * 因此可直接注册进 sites.ts 的 ICONS，不需要放宽 ICONS 的类型。
 *
 * 前一版（E4「贴片 LED + 封装内 2×2 分档」）在 24px 下把封装、网格、实心点、
 * 焊盘、发光射线、底部三点共八组元素叠在一起，实拍缩到实际尺寸后像芯片点阵，
 * 用户判定「还是不太好看」。本版按真实 2835 灯珠收敛到四组：
 *   ① 外框 = 2.8×3.5mm 矩形封装，左上角切斜角 = 2835 常见的阴极倒角标记；
 *   ② 内框 = 中央一整块高透荧光胶 / 发光面（低透明度填充，不切网格）；
 *   ③ 实心小圆点 = 阴极印点；
 *   ④ 封装左右各一条实心短条 = 两端镀锡焊盘 / 电极。
 * 刻意不再加发光射线与分档点阵——24×24 里元素越少越像实物。
 *
 * 24×24 线性笔触、strokeWidth 1.7、圆角端点，与站内其余 lucide 图标同款。
 * sites.json 的 icon key 仍沿用 'led-bin'（历史沿用，避免无谓改动数据层）。
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
      <path d="M6 5 H18.6 A2.2 2.2 0 0 1 20.8 7.2 V16.8 A2.2 2.2 0 0 1 18.6 19 H5.4 A2.2 2.2 0 0 1 3.2 16.8 V8.2 Z" />
      <rect x="7.2" y="7.6" width="9.6" height="8.8" rx="2" fill={color} fillOpacity={0.16} />
      <circle cx="5.3" cy="9" r="0.95" fill={color} stroke="none" />
      <rect x="1.2" y="9.6" width="1.9" height="4.8" rx="0.7" fill={color} stroke="none" />
      <rect x="20.9" y="9.6" width="1.9" height="4.8" rx="0.7" fill={color} stroke="none" />
    </svg>
  ),
)

LedBinIcon.displayName = 'LedBinIcon'

export default LedBinIcon
