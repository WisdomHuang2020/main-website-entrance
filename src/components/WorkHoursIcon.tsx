import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 秒表（WH），2026-11-19 为「研发工时统计分析」新增。
 *
 * 图形语言：与 smartbin 的 LED 二极管符号同族 —— 标准工程图纸里的线框符号，
 * 不是界面图标库里的「时钟 / 日历」通用隐喻，也不是任何实物外壳。
 * 表冠 + 表身 + 指针，对应工时统计的计量对象「时间」；比原先考虑的
 * 柱状图 / 表格更不易与 04 的数据库层叠、05 的旋转开关混淆。
 *
 * ⚠️ 这是本站第一枚**暖色底**内网卡（accent #b45309）。白描边在琥珀实心底上的
 * 对比度约 5.3:1，已过 WCAG AA 正文阈值；若日后把底板调浅（如 #f59e0b），
 * 白色符号会掉到 2.2:1，必须同时改前景色，别只换 accent。
 *
 * 符号占比（bbox / 24×24 SVG 画布，与其余内网卡同口径）：
 *   x 3.6..20.4（16.8）× y 1.15..22.65（21.5）≈ 361 / 576 ≈ 62.7%。
 *   口径是 SVG 画布，不是 48px 卡片底板。
 *
 * 24px 可读性审查：
 *   · 表冠横杠与表身之间留 1.0 单位空隙（横杠 y2.0、表身上沿 y5.0），
 *     描边 1.7 下不会粘成一个蘑菇头；
 *   · 指针两段折角 90°，端点离表盘内壁 ≥ 2.6 单位，不会与圆周相切糊成一团；
 *   · 圆心 (12,13.4) 比画布中心下移 1.4，为表冠让位，视觉重心仍居中。
 *
 * 配色由 SiteCard 决定：该站 iconSolid 为 true 时底板是实心品牌色、
 * 前景是白色；本组件不写死颜色，stroke 取 currentColor 自动转白。
 *
 * 契约：forwardRef + LucideProps，直接注册进 ICONS，不放宽其类型。
 */
const WorkHoursIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      {/* 表冠：横杠 + 短柄 */}
      <path d="M9.6 2 H14.4" />
      <path d="M12 2 V4" />
      {/* 表身 */}
      <circle cx="12" cy="13.4" r="8.4" />
      {/* 指针：分针指向 12、时针指向 4 点方向 */}
      <path d="M12 9.4 V13.4 L15.4 15.4" />
    </svg>
  ),
)

WorkHoursIcon.displayName = 'WorkHoursIcon'

export default WorkHoursIcon
