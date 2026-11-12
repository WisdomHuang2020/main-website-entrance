import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 2835 SMD LED 正视（G2 实心发光面 / 阴极倒角），2026-11-12 用户从四种「占位放大」草案中选定。
 *
 * 为什么是自定义 SVG：已装的 lucide-react 没有 LED / diode 实物图标，
 * 最接近的 lightbulb / microchip 都不是灯珠本体。
 * 本组件实现 LucideIcon 的完整契约（forwardRef + LucideProps + currentColor），
 * 因此可直接注册进 sites.ts 的 ICONS，不需要放宽 ICONS 的类型。
 *
 * 版本沿革：
 *   - E4「贴片 LED + 封装内 2×2 分档」：24px 下把封装、网格、实心点、焊盘、
 *     发光射线、底部三点共八组元素叠在一起，实拍缩到实际尺寸后像芯片点阵，
 *     用户判定「还是不太好看」。
 *   - F2「2835 阴极倒角」：收敛到四组（外框 / 内框发光胶 / 阴极印点 / 两端焊盘），
 *     形态对了，但 2026-11-12 用户实拍反馈「图标里面的 LED 符号占位面积」偏小。
 *     实测两层留白叠加：48px 蓝色底板里只放 24px SVG，而封装 bbox 仅 17.6×14，
 *     占 24×24 画布约 43%；中央发光胶 9.6×8.8，仅约 15%。
 *   - 本版 G2：只放大几何、不加元素、不改 SiteCard 的 24px 渲染尺寸。
 *     封装 bbox 放到 20.4×16.4（占画布约 58%，长宽比仍约 1.24，接近 2835 的 3.5:2.8），
 *     发光胶放大到 14.8×12.6（占画布约 32%）并把填充透明度 0.16 提到 0.32，
 *     让发光面成为视觉主体，消掉「大框套小框、中间空」的观感。
 *
 * 四组元素（与 F2 同构，仅尺寸与填充不同）：
 *   ① 外框 = 2.8×3.5mm 矩形封装，左上角切斜角 = 2835 常见的阴极倒角标记；
 *   ② 内框 = 中央一整块高透荧光胶 / 发光面（填充，不切网格）；
 *   ③ 实心小圆点 = 阴极印点；
 *   ④ 封装左右各一条实心短条 = 两端镀锡焊盘 / 电极。
 * 刻意不再加发光射线与分档点阵——24×24 里元素越少越像实物。
 *
 * 坑（2026-11-12 实拍发现）：内矩形必须显式写 stroke="none"。根 <svg> 带 stroke={color}，
 * 子元素会继承，不写就变成第二层描边空框，放大尺寸后反而是更明显的「框中框」，
 * 与「发光面填满」的意图相反。实心元素（印点、焊盘）同理已全部显式 stroke="none"。
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
      <path d="M5.6 3.8 H19.8 A2.4 2.4 0 0 1 22.2 6.2 V17.8 A2.4 2.4 0 0 1 19.8 20.2 H4.2 A2.4 2.4 0 0 1 1.8 17.8 V7.6 Z" />
      <rect x="4.6" y="5.7" width="14.8" height="12.6" rx="1.6" fill={color} fillOpacity={0.32} stroke="none" />
      <circle cx="3.5" cy="6.4" r="1" fill={color} stroke="none" />
      <rect x="0.4" y="8.5" width="2" height="7" rx="0.7" fill={color} stroke="none" />
      <rect x="21.6" y="8.5" width="2" height="7" rx="0.7" fill={color} stroke="none" />
    </svg>
  ),
)

LedBinIcon.displayName = 'LedBinIcon'

export default LedBinIcon
