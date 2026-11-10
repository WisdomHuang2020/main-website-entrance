import type { DayPoint } from '../../lib/adminApi'

/**
 * 访问趋势折线图（手写 SVG，不引图表库）。
 *
 * 为什么不引 Recharts / Chart.js：这两者 gzip 后 80–140 KB，而这里只需要
 * 两条折线 + 网格。为一张图给整站加 100KB 不划算，且手写 SVG 能用 Tailwind 的
 * 语义色类名（stroke-brand-light 等），跟随 8 套主题自动换色 —— 图表库的配色
 * 通常得手动传色值，换肤时会与页面脱节。
 *
 * 坐标映射：把 days.length 个点均匀铺满宽度；y 轴从 0 起，上限取两序列最大值再
 * 上取整到「好看的刻度」，避免折线贴顶。
 */

const W = 720
const H = 220
const PAD = { top: 16, right: 12, bottom: 26, left: 40 }

function niceMax(v: number): number {
  if (v <= 0) return 4
  const pow = 10 ** Math.floor(Math.log10(v))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

export default function TrendChart({ points }: { points: DayPoint[] }) {
  if (!points.length) return null

  const max = niceMax(Math.max(...points.map((p) => Math.max(p.pv, p.uv)), 1))
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const x = (i: number) =>
    PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH

  const line = (pick: (p: DayPoint) => number) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(pick(p)).toFixed(1)}`).join(' ')

  // y 轴刻度：4 条
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t))

  // x 轴要显示哪些日期：点多了隔一个显示；末尾那天必定显示 ——
  // 但如果它和上一个标签挨得太近（14 天视图正好是这种情况，间距只有 6 个单位，
  // 屏幕上就是「11-09 11-10」贴在一起），就把上一个挤掉，保留末尾那天。
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW
  const labelIdx: number[] = []
  points.forEach((_, i) => {
    const wanted = points.length <= 8 || i % 2 === 0 || i === points.length - 1
    if (!wanted) return
    const prev = labelIdx[labelIdx.length - 1]
    if (prev !== undefined && (i - prev) * step < 60) {
      if (i !== points.length - 1) return
      labelIdx.pop()
    }
    labelIdx.push(i)
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="访问趋势">
      {/* 网格与 y 轴刻度 */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray={t === 0 ? undefined : '3 5'}
          />
          <text
            x={PAD.left - 8}
            y={y(t) + 4}
            textAnchor="end"
            className="fill-text-muted font-mono"
            fontSize={10}
          >
            {t}
          </text>
        </g>
      ))}

      {/* PV 折线 */}
      <path
        d={line((p) => p.pv)}
        fill="none"
        className="stroke-brand-light"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* UV 折线：虚线区分 */}
      <path
        d={line((p) => p.uv)}
        fill="none"
        className="stroke-accent"
        strokeWidth={1.75}
        strokeDasharray="5 4"
        strokeLinecap="round"
      />

      {/* 数据点 */}
      {points.map((p, i) => (
        <g key={p.day}>
          <circle cx={x(i)} cy={y(p.pv)} r={2.6} className="fill-brand-light">
            <title>{`${p.day}  PV ${p.pv}`}</title>
          </circle>
          <circle cx={x(i)} cy={y(p.uv)} r={2.2} className="fill-accent">
            <title>{`${p.day}  UV ${p.uv}`}</title>
          </circle>
        </g>
      ))}

      {/* x 轴日期：首尾改用 start / end 对齐 —— 末点落在 x = W - PAD.right，
          若仍 textAnchor="middle"，右半截会超出 viewBox 被裁掉（屏幕上就是「11-1」缺一截）。 */}
      {labelIdx.map((i) => {
        const p = points[i]
        const anchor: 'start' | 'end' | 'middle' =
          points.length === 1 ? 'middle' : i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'
        return (
          <text
            key={`x${p.day}`}
            x={x(i)}
            y={H - 8}
            textAnchor={anchor}
            className="fill-text-muted font-mono"
            fontSize={10}
          >
            {p.day.slice(5)}
          </text>
        )
      })}
    </svg>
  )
}
