/**
 * analytics —— 站群访问量统计与后台认证服务
 * ============================================================================
 * 数据来源：nginx 的 access log（每个站一个独立文件），**不向前端埋点**。
 *
 * 为什么不用前端上报：
 *   ① 要改 10 个子站，每个都得发一次版；
 *   ② 广告拦截器/隐私插件会拦掉上报请求，数据天然缺失；
 *   ③ 服务端日志无法被客户端伪造，口径可复现。
 *
 * 统计口径（写死在这里，前端不再二次计算）：
 *   · PV —— 每个站每天的**文档请求数**。计入：`GET /`、`GET /path`、
 *           `GET /path/`、`GET /xxx.html`。排除：静态资源（js/css/图片/字体/
 *           map）、`/api/*`、非 2xx/3xx 状态码。
 *   · UV —— 同口径下的独立 IP 数。
 *   · 爬虫按 UA 粗筛排除（bot/spider/crawler/slurp/headless 等），
 *     宁可少算也不虚高。
 *
 * 认证：
 *   · 密码用 scrypt 加盐哈希，存 `/etc/entrance-admin/credentials.json`；
 *   · 会话是用 HMAC-SHA256 签名的过期时间戳，放 HttpOnly + Secure + SameSite=Lax
 *     的 cookie 里 —— 服务端不存 session，重启不掉线（签名自带过期）。
 *   · 首次启动若无凭据文件，用 ADMIN_INIT_PASSWORD 初始化；未提供则随机生成并打印到
 *     journal，必须从 `journalctl -u entrance-analytics` 取一次。
 *
 * 缓存：解析全部日志约几百毫秒，按 TTL 缓存 5 分钟，避免每次刷新都全量扫。
 */

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { createInterface } from 'node:readline'

const PORT = Number(process.env.PORT || 8793)
const LOG_DIR = process.env.LOG_DIR || '/var/log/nginx'
const DATA_DIR = process.env.DATA_DIR || '/etc/entrance-admin'
const CRED_FILE = path.join(DATA_DIR, 'credentials.json')
const SITES_FILE = process.env.SITES_FILE || path.join(DATA_DIR, 'sites.json')
const CACHE_TTL = Number(process.env.CACHE_TTL || 300_000) // 5 分钟
const COOKIE_NAME = 'pk_admin'
const SESSION_TTL = 8 * 3600 // 8 小时
const MAX_DAYS = 14 // 与 logrotate 的 rotate 14 对齐

/* ── 站点清单：id 必须与日志文件名前缀一致 ───────────────────────────── */

/**
 * 统计范围 = 门户清单（sites.json）∪ 日志目录里实际存在的站。
 *
 * 为什么必须做并集：
 *   ① 有些站**不在门户卡片里，但仍需要统计** —— mag-integ 就是这种情况，
 *      用户明确要求包含它，而 sites.json 里没有这条；
 *   ② 新站上线时容易忘改 sites.json，只统计清单会静默漏掉，
 *      且页面上不会报错，只会看到一行 0 或者干脆没有这一行。
 *
 * 清单里没有的站用 id 当显示名 —— 不猜中文名，宁可难看也不要写错。
 * 唯一例外是 entrance（门户首页本身，它有独立日志，但不是"子站"）。
 */
function loadSites() {
  const out = []
  try {
    const raw = JSON.parse(fs.readFileSync(SITES_FILE, 'utf8'))
    for (const s of raw) out.push({ id: s.id, name: s.name, internal: !!s.internal })
  } catch (e) {
    console.error('[analytics] 读取站点清单失败:', e.message)
  }

  let names = []
  try {
    names = fs.readdirSync(LOG_DIR)
  } catch (e) {
    console.error('[analytics] 读取日志目录失败:', e.message)
  }

  const seen = new Set(out.map((s) => s.id))
  for (const n of names) {
    const id = siteIdFromLog(n)
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      name: id === 'entrance' ? '总入口 · 门户首页' : id,
      internal: id === 'io',
      unlisted: true,
    })
  }
  return out
}

/**
 * 日志文件名 → 站点 id。
 * `entrance-www.access.log` 归并到 `entrance`（同一个站的两个 server_name）；
 * `access.log`（未匹配 Host 的兜底日志）不归属任何站，直接跳过。
 */
function siteIdFromLog(name) {
  const m = name.match(/^([a-z0-9-]+?)(?:-www)?\.access\.log/)
  return m ? m[1] : null
}

/* ── 日志解析 ───────────────────────────────────────────────────────── */

// combined: IP - - [time] "METHOD PATH PROTO" STATUS BYTES "REFERER" "UA"
const LINE_RE =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "([A-Z]+) (\S+)[^"]*" (\d{3}) \S+ "([^"]*)" "([^"]*)"/i

const STATIC_EXT = new Set([
  '.js', '.mjs', '.css', '.map', '.png', '.jpg', '.jpeg', '.gif', '.webp',
  '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.mp4', '.webm',
  '.pdf', '.zip', '.txt', '.xml', '.json', '.webmanifest',
])

const BOT_RE =
  /bot|spider|crawler|slurp|bingpreview|facebookexternalhit|headless|python-requests|curl\/|wget\/|go-http-client|okhttp|scrapy|axios\//i

/** 只统计"人访问页面"的请求：GET 文档、2xx/3xx、非 API、非静态资源。 */
function isDocumentHit(method, urlPath, status, ua) {
  if (method !== 'GET') return false
  if (status[0] !== '2' && status[0] !== '3') return false
  if (urlPath.startsWith('/api/')) return false
  const clean = urlPath.split('?')[0].split('#')[0]
  const ext = path.extname(clean).toLowerCase()
  if (ext && STATIC_EXT.has(ext)) return false
  if (BOT_RE.test(ua)) return false
  return true
}

/** `10/Nov/2026:15:52:24 +0800` → `2026-11-10` */
const MONTHS = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}
function dayFromStamp(stamp) {
  const m = stamp.match(/^(\d{2})\/([A-Za-z]{3})\/(\d{4})/)
  if (!m) return null
  const mm = MONTHS[m[2]]
  return mm ? `${m[3]}-${mm}-${m[1]}` : null
}

/** 逐行读普通文件或 .gz，回调 (line) */
async function readLines(file, onLine) {
  const isGz = file.endsWith('.gz')
  const stream = fs.createReadStream(file)
  const src = isGz ? stream.pipe(zlib.createGunzip()) : stream
  const rl = createInterface({ input: src, crlfDelay: Infinity })
  for await (const line of rl) {
    if (line) onLine(line)
  }
}

/**
 * 读取某个站某天的日志文件集合。
 * 当前日志名 `x.access.log`，历史是 `x.access.log.1` / `.2.gz` ……
 */
function logFilesFor(siteId, allNames) {
  const out = []
  for (const name of allNames) {
    if (siteIdFromLog(name) !== siteId) continue
    out.push(path.join(LOG_DIR, name))
  }
  return out
}

/* ── 聚合与缓存 ─────────────────────────────────────────────────────── */

let cache = { at: 0, days: 0, data: null }

async function collect(days) {
  const now = Date.now()
  if (cache.data && cache.days === days && now - cache.at < CACHE_TTL) {
    return cache.data
  }

  const sites = loadSites()
  const names = fs.readdirSync(LOG_DIR).filter((n) => n.includes('access') && n.endsWith('.log') || /\.access\.log\.\d+(\.gz)?$/.test(n))

  // 只保留最近 days 天
  const keep = new Set()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000)
    keep.add(d.toISOString().slice(0, 10))
  }

  /** @type {Record<string, Record<string, {pv:number, ips:Set<string>}>>} */
  const perSite = {}
  for (const s of sites) perSite[s.id] = {}

  // 全期 IP 集合：单站一个、全局一个。
  // ⚠️ 汇总 UV **不能**把各天的独立 IP 数相加 —— 同一个人连着来 7 天会被算 7 次，
  // 同一人访问两个站也会各算一次。实测 7 天：累加得 2279，真实去重只有 1319。
  // 所以这里保留集合求并集，UV 才有"多少人"的含义。
  const siteIps = new Map()
  const allIps = new Set()

  for (const s of sites) {
    const files = logFilesFor(s.id, names)
    for (const file of files) {
      let ok = true
      await readLines(file, (line) => {
        if (!ok) return
        const m = LINE_RE.exec(line)
        if (!m) return
        const day = dayFromStamp(m[2])
        if (!day || !keep.has(day)) return
        if (!isDocumentHit(m[3], m[4], m[5], m[7])) return
        const bucket = (perSite[s.id][day] ||= { pv: 0, ips: new Set() })
        bucket.pv++
        bucket.ips.add(m[1])
        let set = siteIps.get(s.id)
        if (!set) siteIps.set(s.id, (set = new Set()))
        set.add(m[1])
        allIps.add(m[1])
      }).catch((e) => {
        // 单个日志坏掉不该让整体失败（比如正在被 logrotate 改名）
        console.error(`[analytics] 读取失败 ${file}: ${e.message}`)
        ok = false
      })
    }
  }

  // 补齐缺失的日期（图表需要连续轴）
  const dayList = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000)
    dayList.push(d.toISOString().slice(0, 10))
  }

  const siteRows = sites.map((s) => {
    const series = dayList.map((day) => {
      const b = perSite[s.id]?.[day]
      return { day, pv: b ? b.pv : 0, uv: b ? b.ips.size : 0 }
    })
    return {
      id: s.id,
      name: s.name,
      internal: s.internal,
      unlisted: !!s.unlisted,
      pv: series.reduce((a, x) => a + x.pv, 0),
      // UV 取全期 IP 并集，不是按天累加（见上面 siteIps 的注释）
      uv: siteIps.get(s.id)?.size ?? 0,
      series,
    }
  })

  const totals = dayList.map((day, i) => ({
    day,
    pv: siteRows.reduce((a, s) => a + s.series[i].pv, 0),
    uv: siteRows.reduce((a, s) => a + s.series[i].uv, 0),
  }))

  const data = {
    generatedAt: new Date().toISOString(),
    days: dayList,
    sites: siteRows.sort((a, b) => b.pv - a.pv),
    totals,
    grand: {
      pv: siteRows.reduce((a, s) => a + s.pv, 0),
      // 全站全期去重：同一个人访问多个站只算一次，这才是"多少人"
      uv: allIps.size,
    },
  }

  cache = { at: now, days, data }
  return data
}

/* ── 凭据与会话 ─────────────────────────────────────────────────────── */

function ensureCreds() {
  if (fs.existsSync(CRED_FILE)) {
    return JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'))
  }
  const init = process.env.ADMIN_INIT_PASSWORD || crypto.randomBytes(9).toString('base64url')
  const creds = {
    salt: crypto.randomBytes(16).toString('hex'),
    hash: '',
    secret: crypto.randomBytes(32).toString('hex'),
    updatedAt: new Date().toISOString(),
  }
  creds.hash = hashPassword(init, creds.salt)
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 })
  console.log(`[analytics] 已生成初始凭据。账号 admin，密码：${init}`)
  console.log('[analytics] 请尽快通过后台「修改密码」改掉。')
  return creds
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex')
}

function verifyPassword(password, creds) {
  const got = Buffer.from(hashPassword(password, creds.salt), 'hex')
  const want = Buffer.from(creds.hash, 'hex')
  return got.length === want.length && crypto.timingSafeEqual(got, want)
}

function signToken(creds) {
  const exp = Date.now() + SESSION_TTL * 1000
  const payload = String(exp)
  const sig = crypto.createHmac('sha256', creds.secret).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

function verifyToken(token, creds) {
  if (!token) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false
  const exp = Number(payload)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  const want = crypto.createHmac('sha256', creds.secret).update(payload).digest('base64url')
  // 长度不同时 timingSafeEqual 会抛错，先比长度
  if (sig.length !== want.length) return false
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))
}

function readCookie(req, name) {
  const raw = req.headers.cookie || ''
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

/* ── HTTP ──────────────────────────────────────────────────────────── */

function json(res, code, body, headers = {}) {
  const buf = Buffer.from(JSON.stringify(body))
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': buf.length,
    'Cache-Control': 'no-store',
    ...headers,
  })
  res.end(buf)
}

function readBody(req, limit = 8 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const p = url.pathname

  try {
    // 健康检查（不鉴权）
    if (p === '/health') return json(res, 200, { ok: true })

    if (!p.startsWith('/api/admin/')) return json(res, 404, { error: 'not found' })

    const creds = ensureCreds()

    // 登录
    if (p === '/api/admin/login' && req.method === 'POST') {
      const { password } = await readBody(req)
      if (typeof password !== 'string' || !password) {
        return json(res, 400, { error: '密码不能为空' })
      }
      if (!verifyPassword(password, creds)) {
        // 固定 300ms 延迟，抹平爆破速率
        await new Promise((r) => setTimeout(r, 300))
        return json(res, 401, { error: '密码不对' })
      }
      const token = signToken(creds)
      return json(
        res,
        200,
        { ok: true },
        {
          'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`,
        },
      )
    }

    // 除登录外都要鉴权
    if (!verifyToken(readCookie(req, COOKIE_NAME), creds)) {
      return json(res, 401, { error: '未登录或会话已过期' })
    }

    if (p === '/api/admin/logout' && req.method === 'POST') {
      return json(res, 200, { ok: true }, {
        'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      })
    }

    if (p === '/api/admin/me') {
      return json(res, 200, { ok: true, user: 'admin' })
    }

    if (p === '/api/admin/password' && req.method === 'POST') {
      const { current, next } = await readBody(req)
      if (typeof current !== 'string' || !verifyPassword(current, creds)) {
        return json(res, 401, { error: '当前密码不对' })
      }
      if (typeof next !== 'string' || next.length < 8) {
        return json(res, 400, { error: '新密码至少 8 位' })
      }
      const salt = crypto.randomBytes(16).toString('hex')
      const updated = {
        salt,
        hash: hashPassword(next, salt),
        secret: crypto.randomBytes(32).toString('hex'), // 轮换密钥：改密码后所有旧会话立即失效
        updatedAt: new Date().toISOString(),
      }
      fs.writeFileSync(CRED_FILE, JSON.stringify(updated, null, 2), { mode: 0o600 })
      // 用新密钥重新签发，让当前会话不掉线
      const token = signToken(updated)
      return json(res, 200, { ok: true }, {
        'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`,
      })
    }

    if (p === '/api/admin/stats') {
      const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 7, 1), MAX_DAYS)
      const data = await collect(days)
      return json(res, 200, data)
    }

    return json(res, 404, { error: 'not found' })
  } catch (e) {
    console.error('[analytics] 请求失败', req.url, e)
    return json(res, 500, { error: 'internal error' })
  }
})

fs.mkdirSync(DATA_DIR, { recursive: true })
ensureCreds()
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[analytics] listening on 127.0.0.1:${PORT}, logs=${LOG_DIR}, data=${DATA_DIR}`)
})
