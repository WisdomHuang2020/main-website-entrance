/**
 * 站群留言板 API（多站点单进程）
 * ============================================================================
 * 与 widget 站 `server/index.mjs` 同源同构，差别只有一处：**一个进程服务多个站**。
 *
 * 为什么合并成一个进程，而不是把 widget-api 复制 5 份
 * ---------------------------------------------------------------
 * 5 份进程 = 5 个端口 + 5 个 DB 文件 + 5 个 systemd 单元 + 5 套备份脚本。
 * 单进程用 `site` 列做逻辑隔离，运维面从 5 份收敛为 1 份；代价是单点故障，
 * 而它本来就是 127.0.0.1 上的只写小服务，挂了只影响留言，不影响任何站的
 * 静态页面（静态文件由 nginx 直接给）。这个代价可以接受。
 *
 * 站点身份的判定
 * ---------------------------------------------------------------
 * 只认 nginx 注入的 `X-Site` 头，**不解析 Host**。原因是 Host 可被客户端
 * 任意构造，而 `proxy_set_header X-Site <id>` 会在 nginx 侧**覆盖**同名头，
 * 客户端自带的伪造值到不了这里。每个 vhost 显式声明自己是谁，
 * 请求与站点的对应关系就写在 nginx 配置里，可审计。
 *
 * 安全边界（与 widget 一致，逐条说明为什么）
 * ---------------------------------------------------------------
 *   · 密码 scrypt 加盐哈希，参数写进哈希串本身，日后可无痛升级；
 *   · 会话令牌 32 字节随机，库里只存 SHA-256，明文只在 httpOnly Cookie；
 *   · Cookie 不设 Domain —— 各子域天然隔离，一个站的会话拿不到另一个站；
 *   · 会话表带 site 列，读取时二次校验，即使令牌被挪用也跨不了站；
 *   · 管理接口校验 Origin 属于本站域名（CSRF），且只走 POST/PATCH/DELETE；
 *   · 不存读者明文 IP，只存加盐哈希用于反滥用计数；
 *   · 初始密码**不生成、不打印、不经聊天传递** —— 走一次性 setup token，
 *     由人在服务器上取 token、在浏览器里自己设定。见 init-site.mjs。
 *
 * 环境变量
 *   PORT              监听端口，默认 8792
 *   DB_PATH           SQLite 路径，默认 /var/lib/feedback-api/data.db
 *   COOKIE_SECURE     1 = Cookie 带 Secure（生产必须为 1），默认 1
 *   IP_SALT           IP 哈希盐；缺省随机（重启后旧计数失效，仅影响限流）
 *   ALLOW_DEV_ORIGINS 开发期额外允许的来源，逗号分隔
 */

import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { SITES } from './sites.mjs'

// ── 配置 ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 8792)
const DB_PATH = process.env.DB_PATH || '/var/lib/feedback-api/data.db'
const COOKIE_SECURE = process.env.COOKIE_SECURE !== '0'
const API_VERSION = '1.0.0'

const SESSION_TTL_MS = 7 * 24 * 3600 * 1000
const SETUP_TTL_MS = 60 * 60 * 1000 // 初始化令牌 60 分钟
const SESSION_COOKIE = 'fb_sess'

// 开发期白名单：显式配置优先；未配置时仅在**非生产**环境放行本机回环。
// 为什么不给默认值一个固定端口列表：本地验证会同时起 4173/4174/4175…，
// 固定列表要么写不全、要么每次改代码（2026-11-02 本地验证时正是这样被 403 挡住）。
// 为什么生产不认回环：生产 unit 里 NODE_ENV=production，这条捷径自动关闭，
// 站点来源只剩站点自己在册的域名 —— 安全边界不因开发便利而松。
const ALLOW_DEV_ORIGINS = (process.env.ALLOW_DEV_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function isLoopbackOrigin(origin) {
  try {
    const u = new URL(origin)
    if (u.protocol !== 'http:') return false
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]'
  } catch {
    return false
  }
}

const IP_SALT = process.env.IP_SALT || randomBytes(16).toString('hex')

const LIMITS = {
  page: 64,
  content: 4000,
  contentMin: 10,
  contact: 200,
  username: 64,
  password: 200,
  passwordMin: 10,
}

// ── 附件（2026-11-02 新增）──────────────────────────────────────────────────
/**
 * 为什么落盘而不进数据库：SQLite 存 blob 会让单条留言的读写放大到 MB 级，
// 备份与 WAL 也会被拖累；而这些文件只在管理员点开时读一次。
 *
 * 为什么是 base64 走 JSON 而不是 multipart：Node 内置模块没有 multipart 解析器，
 * 手写边界解析（boundary、分块、编码、超长行）是典型的高风险低收益代码。
 * 代价是流量膨胀 33%，对「留言附一张截图或一段日志」这个量级可以接受。
 *
 * 为什么禁止 SVG：SVG 是 XML，可以内联 <script>。即便以 attachment 下载，
 * 仍有人会在本地用浏览器打开它——这类文件不该进入站群。
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/lib/feedback-api/uploads'
const ATTACH = {
  maxFiles: 3,
  maxBytes: 2 * 1024 * 1024,      // 单文件 2MB
  maxTotalBytes: 6 * 1024 * 1024, // 一次提交合计 6MB
  // 白名单只放"留言时真会附上的东西"：截图、PDF 说明、日志文本。
  allow: {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'text/csv': 'csv',
  },
}

/** 魔数校验：mime 是客户端自报的，必须用文件头复核，否则改个后缀就能混进来。 */
function sniffOk(mime, buf) {
  const b = (i) => buf[i]
  switch (mime) {
    case 'image/png':
      return b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47
    case 'image/jpeg':
      return b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff
    case 'image/gif':
      return b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x38
    case 'image/webp':
      return (
        buf.slice(0, 4).toString('latin1') === 'RIFF' &&
        buf.slice(8, 12).toString('latin1') === 'WEBP'
      )
    case 'application/pdf':
      return buf.slice(0, 4).toString('latin1') === '%PDF'
    case 'text/plain':
    case 'text/csv': {
      // 纯文本没有魔数，退而求其次：不能含 NUL 字节（二进制特征），且能按 UTF-8 解码
      if (buf.includes(0)) return false
      try {
        new TextDecoder('utf-8', { fatal: true }).decode(buf.subarray(0, 4096))
        return true
      } catch {
        return false
      }
    }
    default:
      return false
  }
}

// ── 通用工具 ────────────────────────────────────────────────────────────────
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

function ipHash(ip) {
  return sha256(IP_SALT + '|' + ip).slice(0, 32)
}

function clientIp(req) {
  const xr = req.headers['x-real-ip']
  if (typeof xr === 'string' && xr) return xr.trim()
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string' && xff) return xff.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const k = part.slice(0, i).trim()
    const v = part.slice(i + 1).trim()
    if (!k) continue
    try {
      out[k] = decodeURIComponent(v)
    } catch {
      out[k] = v
    }
  }
  return out
}

function sendJson(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  res.end(body)
}

function readJson(req, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > maxBytes) {
        reject(Object.assign(new Error('payload too large'), { code: 'TOO_LARGE' }))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      if (!chunks.length) return resolve({})
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(Object.assign(new Error('invalid json'), { code: 'BAD_JSON' }))
      }
    })
    req.on('error', reject)
  })
}

function str(v, max) {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

// ── 限流（进程内存滑动窗口，重启即清零） ────────────────────────────────────
const buckets = new Map()

function rateLimit(key, max, windowMs) {
  const now = Date.now()
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= max) {
    buckets.set(key, arr)
    return false
  }
  arr.push(now)
  buckets.set(key, arr)
  return true
}

setInterval(() => {
  const now = Date.now()
  const LONGEST = 24 * 3600 * 1000
  for (const [k, arr] of buckets) {
    const kept = arr.filter((t) => now - t < LONGEST)
    if (kept.length) buckets.set(k, kept)
    else buckets.delete(k)
  }
}, 10 * 60 * 1000).unref()

// ── 密码哈希（scrypt，参数内置于哈希串） ────────────────────────────────────
function hashPassword(password) {
  const N = 16384
  const r = 8
  const p = 1
  const keylen = 64
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`
}

function verifyPassword(password, stored) {
  try {
    const [algo, Ns, rs, ps, saltB64, hashB64] = stored.split('$')
    if (algo !== 'scrypt') return false
    const salt = Buffer.from(saltB64, 'base64')
    const expected = Buffer.from(hashB64, 'base64')
    const actual = scryptSync(password, salt, expected.length, {
      N: Number(Ns),
      r: Number(rs),
      p: Number(ps),
      maxmem: 64 * 1024 * 1024,
    })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

// 用户不存在时也比对一次，抹掉时间差，避免用户名枚举
const DUMMY_HASH = hashPassword(randomBytes(24).toString('base64'))

// ── 数据库 ──────────────────────────────────────────────────────────────────
mkdirSync(dirname(DB_PATH), { recursive: true })
mkdirSync(UPLOAD_DIR, { recursive: true })
const db = new DatabaseSync(DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;

  CREATE TABLE IF NOT EXISTS admins (
    site          TEXT PRIMARY KEY,
    username      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    site       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip_hash    TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    site       TEXT NOT NULL,
    page       TEXT NOT NULL,
    content    TEXT NOT NULL,
    contact    TEXT,
    status     TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    ip_hash    TEXT,
    ua_hash    TEXT
  );

  CREATE TABLE IF NOT EXISTS setup_tokens (
    site       TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- 附件元数据。文件本体在 UPLOAD_DIR 下，这里只记「谁、原名、多大、存在哪」。
  -- orig_name 仅用于后台显示，永远不参与拼路径（防路径穿越）。
  CREATE TABLE IF NOT EXISTS attachments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    site        TEXT NOT NULL,
    message_id  INTEGER NOT NULL,
    orig_name   TEXT NOT NULL,
    mime        TEXT NOT NULL,
    size        INTEGER NOT NULL,
    stored_name TEXT NOT NULL,
    created_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_msg_site_created ON messages(site, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_msg_site_status  ON messages(site, status);
  CREATE INDEX IF NOT EXISTS idx_att_msg          ON attachments(message_id);
  CREATE INDEX IF NOT EXISTS idx_sess_site        ON sessions(site);
  CREATE INDEX IF NOT EXISTS idx_sess_expires     ON sessions(expires_at);
`)

const nowIso = () => new Date().toISOString()

// ── 附件落盘与读取 ──────────────────────────────────────────────────────────
/**
 * 任一项不合规就**整批拒绝**，不写入部分文件。
 * 半个附件比没有附件更让人困惑：读者以为传上去了，作者看到的是一半。
 */
function saveAttachments(site, messageId, files) {
  if (!Array.isArray(files) || files.length === 0) return { saved: [] }
  if (files.length > ATTACH.maxFiles) return { error: `最多 ${ATTACH.maxFiles} 个附件。` }

  const prepared = []
  let total = 0

  for (const f of files) {
    const name = typeof f?.name === 'string' ? f.name.slice(0, 120) : 'file'
    const mime = typeof f?.mime === 'string' ? f.mime.toLowerCase() : ''
    const ext = ATTACH.allow[mime]
    if (!ext) {
      return { error: `不支持的文件类型：${mime || '未知'}。仅允许 PNG / JPEG / WebP / GIF / PDF / TXT / CSV。` }
    }

    const b64 = typeof f?.data === 'string' ? f.data : ''
    // 先按 base64 长度估算，避免把超大串解码后才判定
    if (b64.length > Math.ceil((ATTACH.maxBytes * 4) / 3) + 16) {
      return { error: `单个附件不能超过 ${ATTACH.maxBytes / 1024 / 1024} MB。` }
    }
    let buf
    try {
      buf = Buffer.from(b64, 'base64')
    } catch {
      return { error: '附件编码无效。' }
    }
    if (buf.length === 0) return { error: '附件内容为空。' }
    if (buf.length > ATTACH.maxBytes) {
      return { error: `单个附件不能超过 ${ATTACH.maxBytes / 1024 / 1024} MB。` }
    }
    total += buf.length
    if (total > ATTACH.maxTotalBytes) {
      return { error: `附件合计不能超过 ${ATTACH.maxTotalBytes / 1024 / 1024} MB。` }
    }
    if (!sniffOk(mime, buf)) {
      return { error: `文件内容与类型不符：${name}` }
    }
    prepared.push({ name, mime, ext, buf })
  }

  const dir = join(UPLOAD_DIR, site)
  mkdirSync(dir, { recursive: true })
  const saved = []
  for (const p of prepared) {
    // 存储名完全由服务端生成；原始文件名只进数据库用于显示，绝不参与拼路径
    const stored = `${randomBytes(16).toString('hex')}.${p.ext}`
    writeFileSync(join(dir, stored), p.buf)
    db.prepare(`
      INSERT INTO attachments (site, message_id, orig_name, mime, size, stored_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(site, messageId, p.name, p.mime, p.buf.length, stored, nowIso())
    saved.push({ name: p.name, mime: p.mime, size: p.buf.length })
  }
  return { saved }
}

function listAttachments(messageId) {
  return db
    .prepare('SELECT id, orig_name AS name, mime, size FROM attachments WHERE message_id = ?')
    .all(messageId)
}

/** 删除留言时一并删文件，否则磁盘只增不减（这里没有回收站）。 */
function deleteAttachmentsOf(site, messageId) {
  const rows = db.prepare('SELECT stored_name FROM attachments WHERE message_id = ?').all(messageId)
  for (const r of rows) {
    const p = join(UPLOAD_DIR, site, r.stored_name)
    try {
      if (existsSync(p)) unlinkSync(p)
    } catch {}
  }
  db.prepare('DELETE FROM attachments WHERE message_id = ?').run(messageId)
}

const q = {
  getAdmin: db.prepare('SELECT * FROM admins WHERE site = ?'),
  upsertAdmin: db.prepare(`
    INSERT INTO admins (site, username, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(site) DO UPDATE SET
      username = excluded.username,
      password_hash = excluded.password_hash,
      updated_at = excluded.updated_at
  `),
  updatePassword: db.prepare('UPDATE admins SET password_hash = ?, updated_at = ? WHERE site = ?'),
  insertSession: db.prepare(
    'INSERT INTO sessions (token_hash, site, created_at, expires_at, ip_hash) VALUES (?, ?, ?, ?, ?)',
  ),
  getSession: db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND site = ?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
  purgeSiteSessions: db.prepare('DELETE FROM sessions WHERE site = ? AND token_hash <> ?'),
  purgeAllSiteSessions: db.prepare('DELETE FROM sessions WHERE site = ?'),
  getSetup: db.prepare('SELECT * FROM setup_tokens WHERE site = ?'),
  putSetup: db.prepare(`
    INSERT INTO setup_tokens (site, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(site) DO UPDATE SET
      token_hash = excluded.token_hash,
      expires_at = excluded.expires_at,
      created_at = excluded.created_at
  `),
  delSetup: db.prepare('DELETE FROM setup_tokens WHERE site = ?'),
}

// ── 会话 ────────────────────────────────────────────────────────────────────
function createSession(site, ip) {
  const token = randomBytes(32).toString('base64url')
  const created = new Date()
  const expires = new Date(created.getTime() + SESSION_TTL_MS)
  q.insertSession.run(sha256(token), site, created.toISOString(), expires.toISOString(), ipHash(ip))
  return { token, expires }
}

function readSession(req, site) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (!token) return null
  const row = q.getSession.get(sha256(token), site)
  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    q.deleteSession.run(row.token_hash)
    return null
  }
  return row
}

function sessionCookie(token, expires) {
  const maxAge = Math.floor((expires.getTime() - Date.now()) / 1000)
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ]
  if (COOKIE_SECURE) parts.push('Secure')
  return parts.join('; ')
}

function clearCookie() {
  const parts = [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0']
  if (COOKIE_SECURE) parts.push('Secure')
  return parts.join('; ')
}

// ── 站点识别与来源校验 ──────────────────────────────────────────────────────
/**
 * 只认 nginx 注入的 X-Site。取不到或不在册一律 404 —— 不给出
 * 「哪个 id 是有效的」这种可用于枚举的反馈。
 */
function resolveSite(req) {
  const raw = req.headers['x-site']
  const id = typeof raw === 'string' ? raw.trim() : ''
  if (!id) return null
  const site = SITES.get(id)
  if (!site) return null
  return { id, ...site }
}

/**
 * 管理接口的同源校验。
 * 无 Origin 的同源非浏览器请求（curl / 服务端调用）放行 —— 它们不携带
 * 目标站的会话 Cookie，拿不到任何数据；真正要挡的是"第三方网页借用
 * 用户浏览器里的 Cookie"这类 CSRF。
 */
function originAllowed(req, site) {
  const origin = req.headers.origin
  if (!origin) return true
  if (ALLOW_DEV_ORIGINS.includes(origin)) return true
  if (!IS_PRODUCTION && isLoopbackOrigin(origin)) return true
  try {
    const host = new URL(origin).host
    return site.hosts.includes(host)
  } catch {
    return false
  }
}

// ── 路由表 ──────────────────────────────────────────────────────────────────
const routes = []

function route(method, pattern, handler) {
  const re = new RegExp('^' + pattern.replace(/:[a-zA-Z]+/g, '([^/]+)') + '$')
  routes.push({ method, re, handler })
}

/** 健康探测：不带 X-Site 时只报服务级信息，带则额外报本站初始化状态。 */
route('GET', '/api/health', async (req, res, ctx) => {
  const payload = { ok: true, version: API_VERSION }
  if (ctx.site) payload.adminConfigured = Boolean(q.getAdmin.get(ctx.site.id))
  sendJson(res, 200, payload)
})

// —— 公开：提交留言 ——
route('POST', '/api/feedback', async (req, res, ctx) => {
  const { site } = ctx
  const ip = ctx.ip

  if (
    !rateLimit(`fb:10m:${site.id}:${ip}`, 5, 10 * 60 * 1000) ||
    !rateLimit(`fb:24h:${site.id}:${ip}`, 20, 24 * 3600 * 1000)
  ) {
    return sendJson(res, 429, { error: '提交过于频繁，请稍后再试。' })
  }

  // 正文 4000 字 + 附件 6MB，base64 后约 8MB；留到 12MB 免得卡在边界
  const body = await readJson(req, 12 * 1024 * 1024)
  const page = str(body.page, LIMITS.page) || '未指定'
  const content = str(body.content, LIMITS.content)
  const contact = str(body.contact, LIMITS.contact)

  // 蜜罐字段：正常用户看不见，填了即为机器人。静默接受但不落库。
  if (str(body.website, 200)) {
    return sendJson(res, 201, { ok: true })
  }

  if (content.length < LIMITS.contentMin) {
    return sendJson(res, 400, { error: `问题描述至少 ${LIMITS.contentMin} 个字。` })
  }

  const uaHash = sha256(String(req.headers['user-agent'] || '')).slice(0, 16)
  const r = db
    .prepare(
      'INSERT INTO messages (site, page, content, contact, status, created_at, ip_hash, ua_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(site.id, page, content, contact || null, 'new', nowIso(), ipHash(ip), uaHash)

  const messageId = Number(r.lastInsertRowid)

  // 附件失败就回滚这条留言：宁可让读者重填，也不要留一条"正文到了、图没到"的记录
  const att = saveAttachments(site.id, messageId, body.files)
  if (att.error) {
    db.prepare('DELETE FROM messages WHERE id = ? AND site = ?').run(messageId, site.id)
    return sendJson(res, 400, { error: att.error })
  }

  console.log(
    `[feedback] ${site.id} 新增 #${messageId} page=${page} len=${content.length} files=${att.saved.length}`,
  )
  sendJson(res, 201, { ok: true, attachments: att.saved.length })
})

// —— 管理：一次性令牌初始化 / 重置密码 ——
/**
 * 令牌由 `init-site.mjs` 在服务器上生成并只打印一次，有效期 60 分钟。
 * 这样做的目的：初始密码永远不经过聊天记录、日志或任何中间人，
 * 由人在浏览器里当场设定。令牌用完即焚。
 */
route('POST', '/api/admin/setup', async (req, res, ctx) => {
  const { site } = ctx
  if (!originAllowed(req, site)) return sendJson(res, 403, { error: '来源不被允许。' })
  if (!rateLimit(`setup:${site.id}:${ctx.ip}`, 10, 15 * 60 * 1000)) {
    return sendJson(res, 429, { error: '尝试次数过多，请 15 分钟后再试。' })
  }

  const row = q.getSetup.get(site.id)
  if (!row) return sendJson(res, 404, { error: '本站没有待用的初始化令牌。请在服务器上运行 init-site.mjs。' })
  if (new Date(row.expires_at).getTime() < Date.now()) {
    q.delSetup.run(site.id)
    return sendJson(res, 410, { error: '初始化令牌已过期，请重新生成。' })
  }

  const body = await readJson(req)
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const username = str(body.username, LIMITS.username) || 'power-admin'
  const password = typeof body.password === 'string' ? body.password.slice(0, LIMITS.password) : ''

  // 两侧都是 64 位 hex 的 SHA-256 串，长度断言放在 timingSafeEqual 之前，
  // 避免长度不等时该函数直接抛错（抛错会比"返回 false"更容易被当成崩溃来排查）。
  const tokenHash = sha256(token)
  const tokOk =
    token.length > 0 &&
    tokenHash.length === row.token_hash.length &&
    timingSafeEqual(Buffer.from(tokenHash), Buffer.from(row.token_hash))

  if (!tokOk) {
    console.warn(`[setup] ${site.id} 令牌不匹配 ip=${ipHash(ctx.ip)}`)
    return sendJson(res, 401, { error: '初始化令牌不正确。' })
  }
  if (password.length < LIMITS.passwordMin) {
    return sendJson(res, 400, { error: `密码至少 ${LIMITS.passwordMin} 位。` })
  }

  const existing = q.getAdmin.get(site.id)
  if (existing) {
    q.updatePassword.run(hashPassword(password), nowIso(), site.id)
  } else {
    const t = nowIso()
    q.upsertAdmin.run(site.id, username, hashPassword(password), t, t)
  }
  q.delSetup.run(site.id)
  q.purgeAllSiteSessions.run(site.id)

  console.log(`[setup] ${site.id} 管理员已初始化 user=${username}`)
  sendJson(res, 200, { ok: true, username })
})

// —— 管理：登录 ——
route('POST', '/api/admin/login', async (req, res, ctx) => {
  const { site } = ctx
  if (!originAllowed(req, site)) return sendJson(res, 403, { error: '来源不被允许。' })
  if (!rateLimit(`login:${site.id}:${ctx.ip}`, 8, 15 * 60 * 1000)) {
    return sendJson(res, 429, { error: '尝试次数过多，请 15 分钟后再试。' })
  }

  const body = await readJson(req)
  const username = str(body.username, LIMITS.username)
  const password = typeof body.password === 'string' ? body.password.slice(0, LIMITS.password) : ''

  const admin = q.getAdmin.get(site.id)
  if (!admin) return sendJson(res, 503, { error: '本站管理员尚未初始化，请先运行 init-site.mjs。' })

  const userOk = username === admin.username
  const passOk = verifyPassword(password || '', userOk ? admin.password_hash : DUMMY_HASH)

  if (!userOk || !passOk) {
    console.warn(`[login] ${site.id} 失败 ip=${ipHash(ctx.ip)} user=${username}`)
    return sendJson(res, 401, { error: '用户名或密码错误。' })
  }

  const { token, expires } = createSession(site.id, ctx.ip)
  console.log(`[login] ${site.id} 成功 user=${username}`)
  sendJson(res, 200, { ok: true, username }, { 'Set-Cookie': sessionCookie(token, expires) })
})

// —— 管理：登出 ——
route('POST', '/api/admin/logout', async (req, res, ctx) => {
  if (!originAllowed(req, ctx.site)) return sendJson(res, 403, { error: '来源不被允许。' })
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  if (token) q.deleteSession.run(sha256(token))
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() })
})

// —— 管理：当前身份 ——
route('GET', '/api/admin/me', async (req, res, ctx) => {
  const sess = readSession(req, ctx.site.id)
  if (!sess) return sendJson(res, 401, { error: '未登录。' })
  const admin = q.getAdmin.get(ctx.site.id)
  sendJson(res, 200, { username: admin?.username || '', expiresAt: sess.expires_at })
})

// —— 管理：留言列表 ——
route('GET', '/api/admin/messages', async (req, res, ctx) => {
  if (!readSession(req, ctx.site.id)) return sendJson(res, 401, { error: '未登录。' })

  const url = new URL(req.url, 'http://x')
  const status = url.searchParams.get('status') || ''
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 200)
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0)

  const filterStatus = ['new', 'read', 'archived'].includes(status)
  const where = filterStatus ? 'WHERE site = ? AND status = ?' : 'WHERE site = ?'
  const args = filterStatus ? [ctx.site.id, status] : [ctx.site.id]

  const items = db
    .prepare(
      `SELECT id, page, content, contact, status, created_at FROM messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...args, limit, offset)

  // 附件随列表一起返回：后台要显示"有几张图"，分页拉取会让列表闪烁
  for (const it of items) it.attachments = listAttachments(it.id)

  const total = Number(db.prepare(`SELECT COUNT(*) AS c FROM messages ${where}`).get(...args).c)

  const counts = { all: 0, new: 0, read: 0, archived: 0 }
  for (const row of db
    .prepare('SELECT status, COUNT(*) AS c FROM messages WHERE site = ? GROUP BY status')
    .all(ctx.site.id)) {
    counts[row.status] = Number(row.c)
    counts.all += Number(row.c)
  }

  sendJson(res, 200, { items, total, counts })
})

// —— 管理：改状态 ——
route('PATCH', '/api/admin/messages/:id', async (req, res, ctx) => {
  const { site } = ctx
  if (!originAllowed(req, site)) return sendJson(res, 403, { error: '来源不被允许。' })
  if (!readSession(req, site.id)) return sendJson(res, 401, { error: '未登录。' })

  const id = Number(req.url.split('?')[0].split('/').pop())
  if (!Number.isInteger(id)) return sendJson(res, 400, { error: 'id 无效。' })

  const body = await readJson(req)
  const status = str(body.status, 16)
  if (!['new', 'read', 'archived'].includes(status)) {
    return sendJson(res, 400, { error: 'status 无效。' })
  }
  const r = db.prepare('UPDATE messages SET status = ? WHERE id = ? AND site = ?').run(status, id, site.id)
  if (!r.changes) return sendJson(res, 404, { error: '留言不存在。' })
  sendJson(res, 200, { ok: true })
})

// —— 管理：删除 ——
route('DELETE', '/api/admin/messages/:id', async (req, res, ctx) => {
  const { site } = ctx
  if (!originAllowed(req, site)) return sendJson(res, 403, { error: '来源不被允许。' })
  if (!readSession(req, site.id)) return sendJson(res, 401, { error: '未登录。' })

  const id = Number(req.url.split('?')[0].split('/').pop())
  if (!Number.isInteger(id)) return sendJson(res, 400, { error: 'id 无效。' })

  const r = db.prepare('DELETE FROM messages WHERE id = ? AND site = ?').run(id, site.id)
  if (!r.changes) return sendJson(res, 404, { error: '留言不存在。' })
  // 先删留言再删文件：即使删文件抛错，数据库也不会留下指向空文件的孤儿记录
  deleteAttachmentsOf(site.id, id)
  sendJson(res, 200, { ok: true })
})

// —— 管理：下载附件 ——
/**
 * 必须带管理员会话才能下 —— 这不是"多余的一道锁"：留言本身对作者以外的
 * 所有人不可见，附件里往往就是电路照片、客户截图，泄露一条等于泄露整条留言。
 *
 * Content-Type 一律 application/octet-stream + Content-Disposition: attachment：
 * 就算上传的是 png，也不让浏览器内联渲染。历史上"图片内联 + 同源"是
 * 存储型 XSS 的常见入口，这里直接掐掉这条路。
 */
route('GET', '/api/admin/attachments/:id', async (req, res, ctx) => {
  const { site } = ctx
  if (!readSession(req, site.id)) return sendJson(res, 401, { error: '未登录。' })

  const id = Number(req.url.split('?')[0].split('/').pop())
  if (!Number.isInteger(id)) return sendJson(res, 400, { error: 'id 无效。' })

  const row = db.prepare('SELECT * FROM attachments WHERE id = ? AND site = ?').get(id, site.id)
  if (!row) return sendJson(res, 404, { error: '附件不存在。' })

  let buf
  try {
    buf = readFileSync(join(UPLOAD_DIR, site.id, row.stored_name))
  } catch {
    return sendJson(res, 404, { error: '附件文件已丢失（可能被手工清理过）。' })
  }

  res.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': buf.length,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.orig_name)}`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  })
  res.end(buf)
})

// —— 管理：改密码 ——
route('POST', '/api/admin/password', async (req, res, ctx) => {
  const { site } = ctx
  if (!originAllowed(req, site)) return sendJson(res, 403, { error: '来源不被允许。' })
  const sess = readSession(req, site.id)
  if (!sess) return sendJson(res, 401, { error: '未登录。' })

  const body = await readJson(req)
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const next = typeof body.newPassword === 'string' ? body.newPassword.slice(0, LIMITS.password) : ''

  const admin = q.getAdmin.get(site.id)
  if (!admin || !verifyPassword(current, admin.password_hash)) {
    return sendJson(res, 401, { error: '当前密码不正确。' })
  }
  if (next.length < LIMITS.passwordMin) {
    return sendJson(res, 400, { error: `新密码至少 ${LIMITS.passwordMin} 位。` })
  }
  if (next === current) {
    return sendJson(res, 400, { error: '新密码不能与当前密码相同。' })
  }

  q.updatePassword.run(hashPassword(next), nowIso(), site.id)
  // 改密后吊销本站其它会话，只保留当前这一个
  q.purgeSiteSessions.run(site.id, sess.token_hash)

  console.log(`[password] ${site.id} 管理员密码已更新`)
  sendJson(res, 200, { ok: true })
})

// ── HTTP 服务 ───────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const started = Date.now()
  const url = (req.url || '/').split('?')[0]
  const ip = clientIp(req)

  if (req.method === 'OPTIONS' && url.startsWith('/api/')) {
    res.writeHead(204, { 'Cache-Control': 'no-store' })
    res.end()
    return
  }

  try {
    if (!url.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'not found' })
    }

    // 健康探测允许完全不带站点；其余接口必须能定位到在册站点。
    // 显式声明了 X-Site 却不在册 → 一律 404，不做「这个 id 不存在」以外的任何解释。
    const site = resolveSite(req)
    const declared = typeof req.headers['x-site'] === 'string'
    if (!site && (declared || url !== '/api/health')) {
      return sendJson(res, 404, { error: '未知站点。' })
    }

    for (const r of routes) {
      if (r.method !== req.method) continue
      if (!r.re.test(url)) continue
      await r.handler(req, res, { ip, site })
      return
    }
    sendJson(res, 404, { error: '接口不存在。' })
  } catch (err) {
    if (err?.code === 'TOO_LARGE') return sendJson(res, 413, { error: '内容过长。' })
    if (err?.code === 'BAD_JSON') return sendJson(res, 400, { error: '请求体不是合法 JSON。' })
    console.error('[error]', err)
    if (!res.headersSent) sendJson(res, 500, { error: '服务器内部错误。' })
  } finally {
    const ms = Date.now() - started
    if (url.startsWith('/api/')) {
      console.log(`${req.method} ${url} ${res.statusCode} ${ms}ms`)
    }
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`feedback-api v${API_VERSION} listening on 127.0.0.1:${PORT}`)
  console.log(`db: ${DB_PATH}`)
  console.log(`sites: ${[...SITES.keys()].join(', ')}`)
  const configured = [...SITES.keys()].filter((id) => Boolean(q.getAdmin.get(id)))
  console.log(`admin configured: ${configured.length ? configured.join(', ') : '(none)'}`)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`收到 ${sig}，正在关闭…`)
    server.close(() => {
      try { db.close() } catch {}
      process.exit(0)
    })
  })
}
