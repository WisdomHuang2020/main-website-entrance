import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

/**
 * 组织架构树（org-chart，2026-11-21 为「组织架构图工作台」新增）。
 *
 * 图形语言：沿用内网七张卡的标准工程图纸符号（LED 二极管 / 示波方波 /
 * DIP 拨码开关 / 多路旋转开关 / 数据库层叠 / 秒表 / 1-Wire 总线）。
 * 组织架构与汇报关系在工程制图里就是一棵自上而下的树：根节点 + 横梁 +
 * 两个下级节点，连线方向即汇报方向。
 *
 * 三个候选（A 纵向树 / B 横向树 / C 四节点矩阵）由用户 2026-11-21 选定 A，
 * 理由是纵向更贴「上级在下级之上」的汇报语义，B 的横向树更像流程图。
 *
 * 符号占比（bbox / 24×24 SVG 画布）：
 *   x 2..22（20）× y 2..21（19）= 380 / 576 ≈ 66.0%。
 *
 * 24px 可读性审查（吸取 DIP 拨码开关串珠的教训）：
 *   · 根节点底边 y6 与横梁 y9 相距 3 单位，两线平行且间距大于描边 1.7，
 *     不会粘成一块；
 *   · 横梁两端与两条下垂线共用端点（同一折点），不是「圆点 + 同 x 竖线」；
 *   · 节点方块 6×4/6×7、圆角 0.8，1.7 描边后仍留空心，不是实心色块。
 *
 * 配色由 SiteCard 决定：该站 iconSolid 为 true 时底板是实心品牌色（#004b96）、
 * 前景是白色；本组件不写死颜色，stroke 取 currentColor 自动转白。
 *
 * 契约：forwardRef + LucideProps，直接注册进 ICONS，不放宽其类型。
 */
const OrgChartIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      {/* 根节点 */}
      <rect x="9" y="2" width="6" height="4" rx="0.8" />
      {/* 竖向引线与横梁，再向下分出两个下级 */}
      <path d="M12 6 V9 M5 9 H19 M5 9 V14 M19 9 V14" />
      {/* 两个下级节点 */}
      <rect x="2" y="14" width="6" height="7" rx="0.8" />
      <rect x="16" y="14" width="6" height="7" rx="0.8" />
    </svg>
  ),
)

OrgChartIcon.displayName = 'OrgChartIcon'

export default OrgChartIcon
