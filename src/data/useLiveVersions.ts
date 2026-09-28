import { useEffect, useState } from 'react'
import { SITES } from './sites'

/**
 * 站点版本的**运行时覆盖层**。
 *
 * 为什么需要它：子站发版频繁，而门户的版本号原先写死在 src/data/sites.json 里，
 * 于是每次子站发版都得手动改 json、重新构建发布门户。用户明确要求去掉这一步。
 *
 * 为什么不能让浏览器直接去子站取：
 *   ① 子站的 `.deployed-version` 被自己的 nginx 封禁 —— `location ~ /\.(?!well-known/) { deny all; }`
 *      实测五个站一律 403；
 *   ② 就算不封，跨子域读响应体需要目标站发 CORS 头，五个子站都没有。
 *
 * 做法：由**门户自己的 nginx** 以同源端点 `/api/version/<id>` 把哨兵文件转出来
 * （见 deploy/nginx-entrance.conf 的「子站版本实时端点」段）。同源 ⇒ 无 CORS 问题，
 * 也绕开了子站的隐藏文件封禁。
 *
 * 降级策略（重要）：
 *   静态值（sites.json）始终作为首屏渲染值与兜底值。端点不可达时（本地 `npm run dev`、
 *   GitHub Pages 兜底通道、nginx 尚未配置）**静默保留静态值** —— 不报错、不显示空值、
 *   不留骨架屏。因此本 hook 只做「升级」，不做「替代」。
 *
 * 返回值：仅包含成功取到实时值的站点，形如 { llc: '2.10.80' }。
 */
export function useLiveVersions(): Record<string, string> {
  const [live, setLive] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false

    Promise.all(
      SITES.map(async (site) => {
        try {
          // 相对路径：根路径部署时为 /api/version/<id>，
          // Pages 子路径部署时为 /main-website-entrance/api/version/<id>（那里没有端点，静默失败）
          const res = await fetch(`./api/version/${site.id}`, { cache: 'no-store' })
          if (!res.ok) return null
          const ctype = res.headers.get('content-type') || ''
          // ⚠️ 实测坑（2026-09-28）：端点未配置时，请求会被 `location /` 的
          //   `try_files $uri $uri/ /index.html` 兜住，**返回 200 + index.html 的 HTML**，
          //   而不是 404。只判 res.ok 会把整页 HTML 当版本号来源，
          //   宽松正则可能从 HTML 里捞到无关数字（如 CSS 里的 0.16.21），
          //   于是在卡片上显示一个凭空的版本号。必须三重收紧：
          //   ① 拒绝 HTML；② 限长；③ 整串锚定匹配。
          if (ctype.indexOf('text/html') >= 0) return null
          const raw = (await res.text()).trim()
          if (raw.length === 0 || raw.length > 24) return null
          const m = raw.match(/^v?(\d+\.\d+\.\d+)$/)
          return m ? ([site.id, m[1]] as const) : null
        } catch {
          // 端点不存在 / 网络失败 / 被拦截 —— 一律静默降级到静态值
          return null
        }
      }),
    ).then((pairs) => {
      if (cancelled) return
      const next: Record<string, string> = {}
      for (const p of pairs) if (p) next[p[0]] = p[1]
      // 一个都没取到就不 setState，避免无意义的重渲染
      if (Object.keys(next).length > 0) setLive(next)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return live
}
