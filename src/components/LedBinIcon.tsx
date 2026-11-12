import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * LED 电路符号（H1：二极管 + 阴极线 + 双发光箭头），2026-11-12 用户从四条
 * 全新语义方向中选定。这是电路图里表示「发光二极管」的通用符号，不是实物封装。
 *
 * 为什么换成这个方向：此前 E4 / F2 / G2 / G1 四版都在画 2835 贴片灯珠的
 * 矩形封装，用户连续四次不满意。根因是 48px 底板里只有 24×24 的画布，
 * 双层矩形框无论放大还是填实都会退化——放大会空、填实会变成色块。
 * 本版不再画封装与内框，改用一套完全不同、且全为线框的图形语言。
 *
 * 版本沿革（保留供后来者避坑）：
 *   - E4「贴片 LED + 封装内 2×2 分档」：八组元素叠加，24px 下像芯片点阵。
 *   - F2「2835 阴极倒角」：双层细线框 + 中间留白，观感被认可，但占位偏小。
 *   - G2「实心发光面」：把「占位大一些」误译成「把内部填实」，外框与实心
 *     内框连成粗边色块，切角与焊盘被吃掉，用户判定「还不如原来的」。
 *   - G1「等比放大双层线框」：只放大不填实，仍是框中框，用户要求换方向。
 *   - 本版 H1：三角形 + 竖线是二极管本体，两道斜箭头表示向外发光。
 *     全部为同一粗细的线框，没有填充、没有内框、没有色块。
 *
 * 符号占比（用户 2026-11-12 要求 > 60%，口径沿用此前给用户的
 * 「符号 bbox 占 24×24 SVG 画布的比例」）：
 *   bbox x 0.8..23.2（22.4）× y 1..20.2（19.2）= 430 / 576 ≈ 74.7%。
 *   实拍白色像素 bbox 因 1.7 描边与抗锯齿略外扩，约 80%（2026-11-12 实测）。
 *   注意这里的口径是 SVG 画布，不是 48px 卡片底板：底板里固定放 24px SVG，
 *   符号再撑满也只能占底板的 (24×24)/(48×48) = 25%（实拍 20.1%）。
 *   若要求「占蓝底方块」超过 60%，必须放大这张卡的 SVG 尺寸
 *   （会与其余 12 张卡不一致），属于另一个需要用户明确拍板的决定，本版没做。
 *
 * 为什么仍是自定义 SVG：已装的 lucide-react 没有 LED / diode 符号
 * （lightbulb / microchip 都不是二极管电路符号）。本组件实现 LucideIcon 的
 * 完整契约（forwardRef + LucideProps + currentColor），因此可直接注册进
 * sites.ts 的 ICONS，不需要放宽 ICONS 的类型。
 *
 * 配色由 SiteCard 决定：该站 `iconSolid: true` 时底板为实心品牌蓝、
 * 图标前景为白色，currentColor 会自动取到白色；其余站仍是半透明 accent 底。
 * 本组件不要写死颜色，否则会破坏这个契约。
 *
 * 文件名与 icon key 沿用历史命名（'led-bin' / LedBinIcon），虽然语义已不再是
 * 「分 BIN 的贴片灯珠」；改名要牵动 sites.json 与数据层，无收益，故不动。
 *
 * 两道发光箭头的实现细节（2026-11-12 本地 8 倍实拍后修正）：箭头尖的直角
 * 折线若画到 3.5 单位长，24px 下会像两个小方块；且第二道箭头起点若贴着
 * x=15 的阴极线，描边会与阴极线糊在一起。故箭头尖缩到 1.8 单位、
 * 第二道起点右移到 x=17。改这两处不影响符号占比，仍远超 60%。
 *
 * 24×24 线性笔触、strokeWidth 1.7、圆角端点，与站内其余 lucide 图标同款。
 * 所有元素继承根 <svg> 的 fill="none" 与 stroke，没有实心区域，
 * 也不会重演 G2 的 stroke 继承事故。
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
      <path d="M0.8 12 H5" />
      <path d="M5 5.2 L15 12 L5 18.8 Z" />
      <path d="M15 3.8 V20.2" />
      <path d="M15 12 H23.2" />
      <path d="M12 5 L16 1" />
      <path d="M14.2 1 H16 V2.8" />
      <path d="M17 8 L21 4" />
      <path d="M19.2 4 H21 V5.8" />
    </svg>
  ),
)

LedBinIcon.displayName = 'LedBinIcon'

export default LedBinIcon
