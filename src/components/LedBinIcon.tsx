import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 2835 SMD LED 正视（G1 等比放大双层线框 / 阴极倒角），2026-11-12 用户从四种
 * 「占位放大」草案中选定 G2 后实拍不满意，改定 G1。
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
 *   - F2「2835 阴极倒角」：收敛到四组，双层细线框 + 中间留白，用户认可这个
 *     观感，但实拍反馈「图标里面的 LED 符号占位面积」偏小。实测两层留白叠加：
 *     48px 蓝色底板里只放 24px SVG，封装 bbox 17.6×14 占 24×24 画布约 43%，
 *     中央内框 9.6×8.8 约 15%。
 *   - G2「实心发光面」：封装放到 20.4×16.4、内框填到 14.8×12.6 且填充
 *     0.16→0.32。上线后用户判定「还不如原来的」——外框与内部连成粗边色块，
 *     切角与焊盘被吃掉，24px 下像一枚蓝色按钮而非灯珠。
 *     根因：把「占位大一些」误译成「把内部填实」，线框符号退化成色块。
 *   - 本版 G1：只等比放大、不填实。外框 20.4×16.4（占画布约 58%，长宽比
 *     仍约 1.24，接近 2835 的 3.5:2.8），内框按同一比例放到 11.2×10.2、
 *     填充回到 0.16，并刻意保留继承的 1.7 描边，维持 F2 的双层细线框层次。
 *
 * 四组元素（与 F2 同构，仅坐标等比放大）：
 *   ① 外框 = 2.8×3.5mm 矩形封装，左上角切斜角 = 2835 常见的阴极倒角标记；
 *   ② 内框 = 中央发光窗 / 荧光胶区，空心双层线框，不切网格、不填实；
 *   ③ 实心小圆点 = 阴极印点；
 *   ④ 封装左右各一条实心短条 = 两端镀锡焊盘 / 电极。
 * 刻意不再加发光射线与分档点阵——24×24 里元素越少越像实物。
 *
 * stroke 继承的说明（G2 踩过的坑）：根 <svg> 带 stroke={color}，子元素会继承。
 * 本版内框**刻意不写 stroke="none"**，正是要靠继承描边形成第二层细线框；
 * 若以后要做「实心发光面」，则必须显式 stroke="none"，否则会得到两层空框。
 * 实心元素（印点、焊盘）不需要描边，已显式写 stroke="none"。
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
      <rect x="6.4" y="6.9" width="11.2" height="10.2" rx="2.3" fill={color} fillOpacity={0.16} />
      <circle cx="4.3" cy="8.5" r="1.05" fill={color} stroke="none" />
      <rect x="0.5" y="9" width="1.9" height="6" rx="0.7" fill={color} stroke="none" />
      <rect x="21.6" y="9" width="1.9" height="6" rx="0.7" fill={color} stroke="none" />
    </svg>
  ),
)

LedBinIcon.displayName = 'LedBinIcon'

export default LedBinIcon
