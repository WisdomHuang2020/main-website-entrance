/**
 * 站群品牌标记：六边形（电力电子的通用符号）+ 中心节点与三条辐条。
 * 语义：多个工具汇聚到同一个入口。
 *
 * 用 currentColor 描边，颜色由父元素的文字色决定，不在这里写死颜色。
 */
export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.6 20.1 7.3v9.4L12 21.4 3.9 16.7V7.3z" />
      <circle cx="12" cy="12" r="2.1" />
      <path d="M12 9.9V6.1M13.8 13.05l2.9 1.7M10.2 13.05l-2.9 1.7" />
    </svg>
  )
}
