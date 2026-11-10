import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, Eye, EyeOff, KeyRound, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { adminApi, type OnlineResponse, type StatsResponse } from '../lib/adminApi'
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
  const [online, setOnline] = useState<OnlineResponse | null>(null)
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

  // 「当前在线」单独走一个轻接口，30 秒轮询一次。
  // 不并进 stats：stats 要扫 14 天日志（几百毫秒），在线只需要尾部几分钟的数据，
  // 混在一起会让刷新频率被前者拖住。失败静默 —— 轮询噪声不该打断看报表。
  useEffect(() => {
    if (!authed) return
    let alive = true
    const tick = () => {
      adminApi
        .online()
        .then((o) => alive && setOnline(o))
        .catch(() => {})
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [authed])

  const onlineMap = useMemo(
    () => new Map((online?.sites ?? []).map((x) => [x.id, x])),
    [online],
  )

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
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric label="当前在线 · 各站相加" value={online?.total ?? 0} live />
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
                    <OnlineBadge item={onlineMap.get(s.id)} windowMin={online?.windowMin ?? 10} />
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
            数据生成于 {new Date(stats.generatedAt).toLocaleString('zh-CN')} · 来源 nginx access log +
            会话心跳 · UV 为期内 IP 去重 · 缓存 5 分钟
          </p>
        )}
      </div>
    </main>
  )
}

/**
 * 站名行尾的「● N 在线」。
 *
 * 两套口径在这里合并显示：
 *   · 会话口径（source='session'）→ `● N/20 在线`，数字是「打开页面的会话数」，
 *     来自前端 60 秒一次的心跳，所以页面开着就一定看得见；
 *   · 日志口径（source='log'）→ `● N 在线`，数字是窗口内有请求的独立 IP，
 *     页面开着不动就数不到，只能当兜底。
 * 0 的时候不渲染 —— 一排「● 0 在线」既吵又没有信息量。
 */
function OnlineBadge({
  item,
  windowMin,
}: {
  item?: OnlineResponse['sites'][number]
  windowMin: number
}) {
  if (!item || item.online <= 0) return null
  const session = item.source === 'session'
  return (
    <span
      className="shrink-0 rounded border border-success/40 px-1.5 py-px font-mono text-[10px] text-success"
      title={
        session
          ? `会话口径：最近 3 分钟内有心跳的会话数（页面开着即算），本站同时上限 ${item.max ?? '—'} 个`
          : `日志口径：最近 ${windowMin} 分钟内有页面请求的独立 IP 数`
      }
    >
      ● {item.online}
      {session && item.max ? `/${item.max}` : ''} 在线
    </span>
  )
}

function Metric({
  label,
  value,
  suffix,
  accent,
  live,
}: {
  label: string
  value: number
  suffix?: string
  accent?: boolean
  /** 在线数：前面加一个呼吸中的绿点，与静态指标区分开 */
  live?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 px-4 py-3">
      <p className="text-[11px] text-text-muted">{label}</p>
      <p
        className={`mt-1 flex items-center font-mono text-2xl tabular-nums ${
          live ? 'text-success' : accent ? 'text-brand-light' : 'text-text-primary'
        }`}
      >
        {live && (
          <span
            className="mr-2 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-success"
            aria-hidden="true"
          />
        )}
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
          <PasswordInput
            className="mt-1.5"
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
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
  // 二次输入：改密码是不可逆操作，打错一个字就得走「删凭据文件 + 重启」的重置流程，
  // 代价远大于多填一栏。
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const hint = useMemo(() => (next && next.length < 8 ? '至少 8 位' : ''), [next])
  const mismatch = confirm.length > 0 && next !== confirm

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setMsg(null)
    if (next !== confirm) {
      setMsg({ ok: false, text: '两次输入的新密码不一致' })
      return
    }
    setBusy(true)
    try {
      await adminApi.changePassword(current, next)
      setMsg({ ok: true, text: '已修改。其它设备上的旧会话已失效。' })
      setCurrent('')
      setNext('')
      setConfirm('')
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
          <PasswordInput
            placeholder="当前密码"
            autoComplete="current-password"
            value={current}
            onChange={setCurrent}
          />
          <PasswordInput
            placeholder="新密码（至少 8 位）"
            autoComplete="new-password"
            value={next}
            onChange={setNext}
          />
          <PasswordInput
            placeholder="再次输入新密码"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
          />
          {hint && <p className="text-xs text-text-muted">{hint}</p>}
          {mismatch && <p className="text-xs text-danger">两次输入不一致</p>}
          {msg && (
            <p className={`text-xs ${msg.ok ? 'text-success' : 'text-danger'}`}>{msg.text}</p>
          )}
          <button
            type="submit"
            disabled={busy || !current || next.length < 8 || next !== confirm}
            className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-surface-elevated disabled:opacity-50"
          >
            {busy ? '提交中…' : '确认修改'}
          </button>
        </form>
      )}
    </section>
  )
}

/**
 * 密码输入框 + 明码/密文切换（小眼睛）。
 *
 * ⚠️ 按钮必须写 `type="button"` —— 它被放在 `<form>` 里，浏览器默认把 button
 * 当作 submit，漏写这一句的话，**点一下眼睛就直接提交登录表单**了。
 *
 * 图标只用颜色变化表示状态，不额外加"已显示"的文字 —— 放在输入框右侧，
 * 说太多反而挤。可访问性靠 aria-label / aria-pressed 补齐。
 */
function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  className?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className={`relative ${className}`}>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        // pr-10 给右侧按钮留位，否则长密码会顶到眼睛图标下面
        className="w-full rounded-lg border border-border bg-bg py-2 pr-10 pl-3 font-mono text-sm text-text-primary outline-none focus:border-brand-light"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? '隐藏密码' : '显示密码'}
        aria-pressed={show}
        title={show ? '隐藏密码' : '显示密码'}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1.5 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:text-text-primary focus-visible:outline-none"
      >
        {show ? (
          <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
