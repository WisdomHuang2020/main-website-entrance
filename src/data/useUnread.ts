import { useEffect, useState } from 'react'
import { SITES } from './sites'

/**
 * 站群未读留言计数（运行时覆盖层）。
 *
 * 数据来源：入口站 nginx 的 `GET /api/unread`（见 deploy/nginx-entrance.conf），
 * 产物由 server/unread-aggregator/ 每 60 秒只读统计两个留言库生成。
 * 与 useLiveVersions 同一套设计：同源端点、相对路径、渐进增强、静默降级。
 *
 * 为什么要校验 generatedAt：
 *   聚合挂掉时脚本会**保留上一份产物**（绝不写全 0），所以端点仍返回 200。
 *   只判 res.ok 会把一份陈旧的计数当成实况展示，而作者会误以为「没有新留言」。
 *   超过 10 分钟没刷新就整体隐藏角标 —— 宁可不显示，不能显示假数字。
 *
 * 为什么只返回 >0 的站点：
 *   用户 2026-11-07 拍板「只显示有新的未读留言数量，没有显示 0」。
 *   0 在这里就被过滤掉，组件连角标都不渲染，不需要在 UI 层再判一次。
 *
 * 降级场景（一律静默，不报错、不留骨架屏）：
 *   · 本地 npm run dev、GitHub Pages 兜底通道（没有该端点）
 *   · 端点未配置时 `location /` 回落成 index.html（200 + HTML）
 *   · 聚合尚未部署 / 网络失败 / JSON 结构不符
 */
const ENDPOINT = './api/unread'
const MAX_AGE_MS = 10 * 60 * 1000
const REFRESH_MS = 60 * 1000

export function useUnread(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    let lastOk = 0
    const allowed = new Set(SITES.map((s) => s.id))

    async function load() {
      try {
        const res = await fetch(ENDPOINT, { cache: 'no-store' })
        if (!res.ok) return

        // 端点未配置时请求会被 try_files 兜住，返回 200 + index.html。
        // 只判 res.ok 会把整页 HTML 交给 res.json()，虽会抛错但不明所以。
        const ctype = res.headers.get('content-type') || ''
        if (ctype.includes('text/html')) return

        const data: unknown = await res.json()
        if (!data || typeof data !== 'object') return
        const payload = data as { generatedAt?: unknown; sites?: unknown }

        const stamp = typeof payload.generatedAt === 'string'
          ? Date.parse(payload.generatedAt)
          : NaN
        if (!Number.isFinite(stamp) || Date.now() - stamp > MAX_AGE_MS) return

        if (!payload.sites || typeof payload.sites !== 'object') return
        const next: Record<string, number> = {}
        for (const [id, value] of Object.entries(payload.sites as Record<string, unknown>)) {
          // 只认门户清单内的站点，且只认非负整数 —— 后端若被换成别的数据源，
          // 这里不会把字符串或对象渲染成角标。
          if (!allowed.has(id)) continue
          if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) continue
          next[id] = value
        }

        lastOk = Date.now()
        if (!cancelled) setCounts(next)
      } catch {
        // 端点不存在 / 网络失败 / JSON 解析失败：保留上次结果，
        // 但若已长期取不到就清空，避免一直挂着陈旧数字。
        if (!cancelled && Date.now() - lastOk > MAX_AGE_MS) setCounts({})
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return counts
}
