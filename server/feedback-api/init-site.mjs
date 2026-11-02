/**
 * 初始化 / 重置某站的管理员 —— 生成一次性 setup 令牌
 * ============================================================================
 * 为什么不是「生成随机密码然后打印」
 * ---------------------------------------------------------------
 * widget 站的 init-admin.mjs 会打印一个随机密码，再由人转述给使用者。
 * 那条路径上密码必然经过终端回滚缓冲、日志、聊天记录中的至少一处。
 * 这里改成：**服务器只打印一次性令牌，密码由使用者在浏览器里当场设定**。
 * 令牌 60 分钟过期、用一次即焚，且库里只存它的 SHA-256。
 *
 * 用法（在服务器上，以 www-data 身份运行，否则 DB 无权写入）
 *   sudo -u www-data /usr/bin/node /opt/feedback-api/init-site.mjs --site llc
 *   sudo -u www-data /usr/bin/node /opt/feedback-api/init-site.mjs --list
 *
 * 输出示例
 *   站点      llc — LLC 谐振变换器设计工具
 *   令牌      Xq7...
 *   有效期至  2026-11-02T11:30:00.000Z（60 分钟内）
 *   设置地址  https://www.llc.power-knowledge.tech/admin
 *   已初始化  否
 */

import { DatabaseSync } from 'node:sqlite'
import { randomBytes, createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { SITES, SITE_TABLE, adminUrl } from './sites.mjs'

const DB_PATH = process.env.DB_PATH || '/var/lib/feedback-api/data.db'
const SETUP_TTL_MS = 60 * 60 * 1000

const argv = process.argv.slice(2)
const opt = (name, fallback = '') => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex')

mkdirSync(dirname(DB_PATH), { recursive: true })
const db = new DatabaseSync(DB_PATH)
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    site TEXT PRIMARY KEY, username TEXT NOT NULL, password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS setup_tokens (
    site TEXT PRIMARY KEY, token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL, created_at TEXT NOT NULL
  );
`)

if (argv.includes('--list') || argv.length === 0) {
  console.log('站点              管理员            状态')
  console.log('─'.repeat(64))
  for (const id of SITES.keys()) {
    const admin = db.prepare('SELECT username, updated_at FROM admins WHERE site = ?').get(id)
    const tok = db.prepare('SELECT expires_at FROM setup_tokens WHERE site = ?').get(id)
    const state = admin
      ? `已初始化 ${admin.username}（${admin.updated_at.slice(0, 10)} 改）`
      : '未初始化'
    const pending = tok && new Date(tok.expires_at).getTime() > Date.now() ? ' · 有待用令牌' : ''
    console.log(`${id.padEnd(18)}${(admin?.username || '—').padEnd(18)}${state}${pending}`)
  }
  console.log('\n提示：为某站生成初始化令牌 →  --site <id>')
  process.exit(0)
}

const siteId = opt('--site')
if (!siteId || !SITE_TABLE[siteId]) {
  console.error(`站点 id 无效：${siteId || '(空)'}`)
  console.error(`在册站点：${[...SITES.keys()].join(', ')}`)
  process.exit(1)
}

const token = randomBytes(32).toString('base64url')
const created = new Date()
const expires = new Date(created.getTime() + SETUP_TTL_MS)

db.prepare(`
  INSERT INTO setup_tokens (site, token_hash, expires_at, created_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(site) DO UPDATE SET
    token_hash = excluded.token_hash,
    expires_at = excluded.expires_at,
    created_at = excluded.created_at
`).run(siteId, sha256(token), expires.toISOString(), created.toISOString())

const admin = db.prepare('SELECT username FROM admins WHERE site = ?').get(siteId)

// --token-only：只输出令牌本身，供脚本消费。
// 人类阅读版里「令牌」二字会出现在多行提示中，用 grep 抓很容易连带抓进上下文
// （2026-11-02 本地联调时正因此把 4 行中文一起塞进了 JSON，报「请求体不是合法 JSON」）。
if (argv.includes('--token-only')) {
  process.stdout.write(token + '\n')
  db.close()
  process.exit(0)
}

console.log('')
console.log(`站点      ${siteId} — ${SITE_TABLE[siteId].name}`)
console.log(`令牌      ${token}`)
console.log(`有效期至  ${expires.toISOString()}（60 分钟内有效，用一次即失效）`)
console.log(`设置地址  ${adminUrl(siteId)}`)
console.log(`当前状态  ${admin ? `已初始化（${admin.username}），本次令牌用于【重置密码】` : '未初始化，本次令牌用于【首次设定密码】'}`)
console.log('')
console.log('注意：令牌只显示这一次。请直接在浏览器打开上面的设置地址，')
console.log('      粘贴令牌并自行设定密码。不要把它贴进聊天记录或提交到仓库。')
console.log('')

db.close()
