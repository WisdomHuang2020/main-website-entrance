import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, KeyRound, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { adminApi, type StatsResponse } from '../lib/adminApi'
import TrendChart from '../components/admin/TrendChart'

/**
 * 站群访问量后台（/admin）。
 *
 * 三层状态：
 *   authed = null   → 正在问服务端「我这会话还有效吗」，先不闪登录框
 *   authed = false  → 登录卡
 *   authed = true   → 仪表盘
 *
 * 数据口径全部由后端算好（见 server/analytics/index.mjs），前端只负责呈现 ——
 * 这样换个客户端（比如以后做一个 CLI）拿到的是同一套数字。
 */

const DAY_OPTIONS = [7, 14]

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [days, setDays] = useState(7)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  // 首屏先探一次会话，避免已登录用户看到登录框闪一下
  useEffect(() => {
    let alive = true
    adminApi
      .me()
      .then(() => alive && setAuthed(true))
      .catch(() => alive && setAuthed(false))
    return () => {
      alive = false
    }
  }, [])

  const load = useCallback(
    async (d: number) => {
      setLoading(true)
      setErr('')
      try {
        const data = await adminApi.stats(d)
        setStats(data)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '加载失败'
        if (msg.includes('未登录')) setAuthed(false)
        else setErr(msg)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (authed) void load(days)
  }, [authed, days, load])

  if (authed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg">
        <p className="font-mono text-xs text-text-muted">正在确认会话…</p>
      </main>
    )
  }

  if (!authed) {
    return <LoginCard onSuccess={() => setAuthed(true)} />
  }

  const maxPv = Math.max(...(stats?.sites.map((s) => s.pv) ?? [1]), 1)

  return (
    <main className="min-h-screen bg-bg pb-16 text-text-primary">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <a
            href="./"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">返回入口</span>
          </a>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-brand-light" strokeWidth={2} aria-hidden="true" />
            站群访问量
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => void load(days)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={2} aria-hidden="true" />
              刷新
            </button>
            <button
              type="button"
              onClick={async () => {
                await adminApi.logout().catch(() => {})
                setAuthed(false)
                setStats(null)
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 pt-6 sm:px-6">
        {err && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>
        )}

        {/* 总览数字 */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="总浏览量 PV" value={stats?.grand.pv ?? 0} accent />
          <Metric label="独立访客 UV" value={stats?.grand.uv ?? 0} />
          <Metric label="站点数" value={stats?.sites.length ?? 0} />
          <Metric label="统计天数" value={days} suffix="天" />
        </section>

        {/* 趋势 */}
        <section className="rounded-xl border border-border bg-surface/60 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-medium">每日访问趋势</h2>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-muted">
              <i className="h-0.5 w-4 rounded bg-brand-light" aria-hidden="true" />PV
              <i className="ml-2 h-0.5 w-4 rounded bg-accent" aria-hidden="true" />UV
            </span>
            <div className="ml-auto inline-flex overflow-hidden rounded-md border border-border">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 text-xs transition-colors ${
                    days === d
                      ? 'bg-brand/20 text-brand-light'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                  }`}
                >
                  {d} 天
                </button>
              ))}
            </div>
          </div>
          {stats ? (
            <TrendChart points={stats.totals} />
          ) : (
            <div className="h-[220px] animate-pulse rounded-lg bg-surface-elevated" />
          )}
        </section>

        {/* 各站排行 */}
        <section className="rounded-xl border border-border bg-surface/60">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">各站访问量</h2>
            <span className="font-mono text-[11px] text-text-muted">按 PV 降序</span>
          </div>
          <ul className="divide-y divide-border-light">
            {(stats?.sites ?? []).map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 shrink-0 font-mono text-[11px] text-text-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-sm">{s.name}</span>
                    {s.internal && (
                      <span className="shrink-0 rounded border border-internal/40 px-1.5 py-px font-mono text-[10px] text-internal-light">
                        内网
                      </span>
                    )}
                  </span>
                  {/* 占比条：以最高站的 PV 为 100% */}
                  <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
                    <span
                      className="block h-full rounded-full bg-brand-light"
                      style={{ width: `${Math.round((s.pv / maxPv) * 100)}%` }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm tabular-nums">{s.pv}</span>
                  <span className="block font-mono text-[10px] text-text-muted">UV {s.uv}</span>
                </span>
              </li>
            ))}
            {stats && stats.sites.every((s) => s.pv === 0) && (
              <li className="px-4 py-8 text-center text-sm text-text-muted">
                这段时间没有任何页面访问记录
              </li>
            )}
          </ul>
        </section>

        <PasswordPanel />

        {stats && (
          <p className="text-center font-mono text-[10px] text-text-muted">
            数据生成于 {new Date(stats.generatedAt).toLocaleString('zh-CN')} · 来源 nginx access log ·
            UV 为期内 IP 去重 · 缓存 5 分钟
          </p>
        )}
      </div>
    </main>
  )
}

function Metric({ label, value, suffix, accent }: { label: string; value: number; suffix?: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 px-4 py-3">
      <p className="text-[11px] text-text-muted">{label}</p>
      <p
        className={`mt-1 font-mono text-2xl tabular-nums ${accent ? 'text-brand-light' : 'text-text-primary'}`}
      >
        {value.toLocaleString('zh-CN')}
        {suffix && <span className="ml-1 text-xs text-text-muted">{suffix}</span>}
      </p>
    </div>
  )
}

function LoginCard({ onSuccess }: { onSuccess: () => void }) {
  // 账号预填当前账号名（2026-11-10 由 admin 改为 power-admin）；仍可编辑 ——
  // 万一以后改回别的名字，这里不用跟着改代码。
  const [username, setUsername] = useState('power-admin')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password || busy) return
    setBusy(true)
    setErr('')
    try {
      await adminApi.login(username, password)
      onSuccess()
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : '登录失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-light" strokeWidth={2} aria-hidden="true" />
          <h1 className="text-base font-semibold">站群后台</h1>
        </div>
        <label className="block text-xs text-text-secondary">
          账号
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-brand-light"
          />
        </label>
        <label className="mt-3 block text-xs text-text-secondary">
          密码
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-brand-light"
          />
        </label>
        {err && <p className="mt-3 text-xs text-danger">{err}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-5 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-light disabled:opacity-50"
        >
          {busy ? '登录中…' : '登录'}
        </button>
        <p className="mt-4 text-center font-mono text-[10px] text-text-muted">
          仅统计 PV/UV，不采集访客个人信息
        </p>
      </form>
    </main>
  )
}

function PasswordPanel() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const hint = useMemo(() => (next && next.length < 8 ? '至少 8 位' : ''), [next])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      await adminApi.changePassword(current, next)
      setMsg({ ok: true, text: '已修改。其它设备上的旧会话已失效。' })
      setCurrent('')
      setNext('')
    } catch (e2) {
      setMsg({ ok: false, text: e2 instanceof Error ? e2.message : '修改失败' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <KeyRound className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        修改密码
        <span className="ml-auto font-mono text-[11px] text-text-muted">{open ? '收起' : '展开'}</span>
      </button>
      {open && (
        <form onSubmit={submit} className="space-y-3 border-t border-border px-4 py-4">
          <input
            type="password"
            placeholder="当前密码"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-brand-light"
          />
          <input
            type="password"
            placeholder="新密码（至少 8 位）"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm outline-none focus:border-brand-light"
          />
          {hint && <p className="text-xs text-text-muted">{hint}</p>}
          {msg && (
            <p className={`text-xs ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>
          )}
          <button
            type="submit"
            disabled={busy || !current || next.length < 8}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-surface-elevated disabled:opacity-50"
          >
            {busy ? '提交中…' : '确认修改'}
          </button>
        </form>
      )}
    </section>
  )
}
