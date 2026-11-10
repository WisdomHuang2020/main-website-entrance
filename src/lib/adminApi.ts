/**
 * 后台 API 封装。
 *
 * 所有请求都带 `credentials: 'include'` —— 会话是 HttpOnly cookie，
JS 拿不到也伪造不了。
 * 端点前缀 `/api/admin/`，由 nginx 反代到 127.0.0.1:8793（analytics 服务）。
 */

export type DayPoint = { day: string; pv: number; uv: number }

export type SiteRow = {
  id: string
  name: string
  internal: boolean
  pv: number
  uv: number
  series: DayPoint[]
}

export type StatsResponse = {
  generatedAt: string
  days: string[]
  sites: SiteRow[]
  totals: DayPoint[]
  grand: { pv: number; uv: number }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    /* 非 JSON（比如 nginx 的 502 页面） */
  }
  if (!res.ok) {
    const msg = (body as { error?: string } | null)?.error
    throw new Error(msg || `请求失败（HTTP ${res.status}）`)
  }
  return body as T
}

export const adminApi = {
  login: (password: string) =>
    call<{ ok: true }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  logout: () => call<{ ok: true }>('/api/admin/logout', { method: 'POST' }),

  me: () => call<{ ok: true; user: string }>('/api/admin/me'),

  stats: (days: number) => call<StatsResponse>(`/api/admin/stats?days=${days}`),

  changePassword: (current: string, next: string) =>
    call<{ ok: true }>('/api/admin/password', {
      method: 'POST',
      body: JSON.stringify({ current, next }),
    }),
}
