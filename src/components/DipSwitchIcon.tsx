import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * DIP 拨码开关（P-N2），2026-11-12 用户为「电源型号编码生成器」选定。
 *
 * 图形语言：与 smartbin 的 LED 二极管符号同族 —— 标准工程图纸里的元件符号，
 * 不是界面图标库隐喻。拨码开关是硬件上按位设定地址 / 型号 / 编码的真实元件：
 * 本体 + 两侧引脚 + 三条滑槽 + 三个处在不同位置的滑块，直接对应
 * 「按既定规则把若干位组合成一段型号编码」这件事。
 *
 * 为什么必须换掉原先的 Calculator：它既与公开站 05「电源与照明工程计算器」
 * 完全撞图，语义也错 —— 型号编码是规则拼装，不是数值计算。
 *
 * 符号占比（bbox / 24×24 SVG 画布）：
 *   x 1.5..22.5（21）× y 2.5..21.5（19）= 399 / 576 ≈ 69.3%。
 *
 * 2026-11-12 本地 8 倍实拍后的修正（用户拍板选 B）：
 *   原样把滑槽画成贯穿竖线（M7 7 V17 等），三个 r=1.2 的滑块圆被竖线串成哑铃，
 *   24px 下退化成三根白柱，滑块高低（y 9.5 / 14.5 / 9.5）完全看不出来。
 *   现改为每条滑槽在滑块圆上下各留 0.3 单位断口（上段止于 8 / 13，
 *   下段始于 11 / 16），圆点独立成空心滑块，位置差异一眼可辨。
 *   几何 bbox 未变，仍约 69.3%；底板配色与其余三卡一致，仍由 SiteCard 决定。
 *   备选 D（滑块改短横、纯线框无圆点）实拍后用户未选，别按「更贴 H1」擅自换回去。
 *
 * 配色由 SiteCard 决定：该站 iconSolid 为 true 时底板是实心品牌色、
 * 前景是白色；本组件不写死颜色，stroke 取 currentColor 自动转白。
 *
 * 契约：forwardRef + LucideProps，直接注册进 ICONS，不放宽其类型。
 */
const DipSwitchIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <path d="M3 2.5 H21 V21.5 H3 Z" />
      <path d="M1.5 8 H3 M1.5 16 H3 M21 8 H22.5 M21 16 H22.5" />
      <path d="M7 7 V8 M7 11 V17" />
      <path d="M12 7 V13 M12 16 V17" />
      <path d="M17 7 V8 M17 11 V17" />
      <circle cx="7" cy="9.5" r="1.2" />
      <circle cx="12" cy="14.5" r="1.2" />
      <circle cx="17" cy="9.5" r="1.2" />
    </svg>
  ),
)

DipSwitchIcon.displayName = 'DipSwitchIcon'

export default DipSwitchIcon
