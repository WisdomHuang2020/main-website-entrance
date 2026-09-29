/**
 * 站群品牌标记（主入口） —— 与本站 public/favicon.svg 完全同源。
 *
 * 造型：六边形外壳内的中心节点（门户 / 枢纽意象）。
 * 语义：多个子站工具汇聚到同一个入口。
 *
 * ⚠️ 与 public/favicon.svg 使用同一套 path 数据：改一处必须同步另一处。
 * 主形用站群统一 teal #14b8a6；amber 中心点为站群固定标记。
 *
 * 变更（2026-09-29）：原为 24 viewBox 的「六边形 + 节点 + 三条辐条」，
 * 而本站 favicon 并无辐条 —— 二者本就不一致。现统一为同一套 path：
 * 去掉辐条，与 favicon 完全同源（三条辐条在 16px 下也会糊成一团，去除后更清晰）。
 */
export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0a0a0a" />
      <path
        d="M16 4 L27.4 10.4 L27.4 21.6 L16 28 L4.6 21.6 L4.6 10.4 Z"
        fill="none"
        stroke="#14b8a6"
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="3.2" fill="#f59e0b" />
    </svg>
  )
}
