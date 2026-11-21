import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 1-Wire 单总线（connect，2026-11-21 为「1-Wire 单总线」站新增）。
 *
 * 图形语言：沿用内网五张卡的标准工程图纸符号（LED 二极管 / 示波方波 /
 * DIP 拨码开关 / 多路旋转开关 / 数据库层叠）。1-Wire 的物理层
 * 就是「一根数据线挂多个器件、靠一只上拉电阻回到空闲高电平」——
 * 水平总线 + 上拉电阻 + 两个挂载器件，直接对应这种拓扑。
 *
 * 三个候选（A 总线+上拉+双器件 / B 单总线+单器件 / C 器件芯片+DQ 引脚）
 * 由用户 2026-11-21 选定 A，理由是同族里最能表达「多节点共用一根线」。
 *
 * 符号占比（bbox / 24×24 SVG 画布）：
 *   x 1.5..22.5（21）× y 1.8..20（18.2）= 382 / 576 ≈ 66.3%。
 *
 * 24px 可读性审查（吸取 DIP 拨码开关串珠的教训）：
 *   · 总线上只挂一个电阻与两条下垂线，线与线之间水平间距 ≥ 3.5 单位，
 *     不与任何竖线共用 x，不会形成串珠或哑铃；
 *   · 器件方块 4×6、圆角 0.6，1.7 描边后内部仍有约 0.6 单位净空，
 *     24px 下是空心框而不是实心块；
 *   · 上拉电阻顶端短线止于 y1.8，距画布上沿 1.8 单位，描边不越界。
 *
 * 配色由 SiteCard 决定：该站 iconSolid 为 true 时底板是实心品牌色（#0d9488）、
 * 前景是白色；本组件不写死颜色，stroke 取 currentColor 自动转白。
 *
 * 契约：forwardRef + LucideProps，直接注册进 ICONS，不放宽其类型。
 */
const ConnectBusIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      {/* 数据总线 */}
      <path d="M1.5 8 H22.5" />
      {/* 上拉电阻：本体 + 到总线的引线 + 顶端到 VDD 的短线 */}
      <rect x="4" y="2.6" width="3" height="3" rx="0.4" />
      <path d="M5.5 5.6 V8 M5.5 2.6 V1.8" />
      {/* 两个挂载器件：方块本体 + 各自到总线的下垂线 */}
      <rect x="8.5" y="14" width="4" height="6" rx="0.6" />
      <path d="M10.5 8 V14" />
      <rect x="15.5" y="14" width="4" height="6" rx="0.6" />
      <path d="M17.5 8 V14" />
    </svg>
  ),
)

ConnectBusIcon.displayName = 'ConnectBusIcon'

export default ConnectBusIcon
