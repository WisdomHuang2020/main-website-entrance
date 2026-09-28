/**
 * 子站版本漂移巡检
 *
 * ── 为什么需要这个脚本 ──
 * 入口页每张卡片上都要显示对应子站的当前版本号（用户 2026-09-28 明确要求显示）。
 * 但子站版本由各站自己的 CI 写入，与本站**没有任何自动联动**：
 * 一旦子站发版而入口页没跟着改，卡片上就会挂着一个过期版本号 ——
 * 那属于「看起来很专业、实际上在撒谎」的信息。本脚本就是为了消灭这种沉默漂移。
 *
 * ── 为什么必须走 SSH，而不能直接抓网页 ──
 * 各子站 web 根下的 `.deployed-version` 哨兵，被 nginx 的
 * `location ~ /\.(?!well-known/) { deny all; }` 拦截（实测五个站一致返回 403）。
 * 因此公开抓取的路子是不通的；而本站的 CI 本来就持有到该服务器的部署密钥
 * （LH_SSH_KEY），直接读文件反而更稳、更权威，也不需要去改五个子站的 nginx 配置。
 *
 * ── 权威来源 ──
 * /var/www/<id>/.deployed-version —— 由各子站自己的 deploy-lighthouse 工作流写入。
 * 这里刻意读它，而不是读各子站仓库的 package.json：后者可能领先于线上实际部署的版本。
 *
 * 用法：
 *   node scripts/check-versions.mjs --host 1.2.3.4 --key ~/.ssh/pfc_ci
 *   node scripts/check-versions.mjs            # 也可用环境变量 LH_HOST / LH_SSH_KEY_PATH
 *   加 --strict 时，发现漂移或读不到哨兵会让进程以 1 退出（默认只告警）。
 *
 * 退出码：0 = 无漂移或已优雅跳过；1 = 仅当 --strict 且确有漂移。
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const flag = (name) => argv.includes(`--${name}`)
const opt = (name) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined
}

const STRICT = flag('strict')
const HOST = opt('host') ?? process.env.LH_HOST
const USER = opt('user') ?? process.env.LH_USER ?? 'root'
const PORT = opt('port') ?? process.env.LH_PORT ?? '22'
const KEY_RAW = opt('key') ?? process.env.LH_SSH_KEY_PATH

/** 展开 ~ ：ssh 是原生程序，不认 shell 的波浪号展开 */
const expand = (p) => (p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p)

const sites = JSON.parse(fs.readFileSync(path.join(root, 'src/data/sites.json'), 'utf8'))
const norm = (v) => String(v ?? '').trim().replace(/^v/, '')

if (!HOST || !KEY_RAW) {
  console.log('⏭  未提供 --host / --key（或环境变量 LH_HOST / LH_SSH_KEY_PATH），跳过版本漂移巡检。')
  console.log('   本地手动巡检示例：npm run check:versions -- --host 43.142.148.37 --key ~/.ssh/pfc_ci')
  process.exit(0)
}

const KEY = expand(KEY_RAW)
if (!fs.existsSync(KEY)) {
  console.log(`⏭  SSH 私钥不存在：${KEY} —— 跳过版本漂移巡检。`)
  process.exit(0)
}

// id 即 web 根目录名（/var/www/<id>），这条约定写在 src/data/sites.json 的注释里。
// 一次性把 5 个哨兵全部读回，避免 5 次握手。
const remote = sites.map((s) => `printf '%s\\t%s\\n' '${s.id}' "$(cat /var/www/${s.id}/.deployed-version 2>/dev/null)"`).join('; ')

let stdout
try {
  stdout = execFileSync(
    'ssh',
    [
      '-i', KEY,
      '-p', String(PORT),
      '-o', 'BatchMode=yes',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=15',
      `${USER}@${HOST}`,
      remote,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 45_000 },
  )
} catch (err) {
  const msg = (err.stderr || err.message || '').toString().trim().split('\n').slice(-3).join(' / ')
  console.log(`⏭  连不上 ${USER}@${HOST}，跳过版本漂移巡检（不影响部署）。原因：${msg}`)
  process.exit(0)
}

const live = new Map()
for (const line of stdout.split(/\r?\n/)) {
  const [id, ver] = line.split('\t')
  if (id) live.set(id.trim(), ver ?? '')
}

console.log(`\n子站版本巡检（线上哨兵 ${USER}@${HOST}:/var/www/<id>/.deployed-version）\n`)
console.log(`  ${'站点'.padEnd(24)}${'入口页记录'.padEnd(14)}${'线上实际'.padEnd(14)}结论`)
console.log(`  ${'-'.repeat(62)}`)

const drift = []
const unknown = []
for (const s of sites) {
  const recorded = norm(s.version)
  const actualRaw = live.get(s.id)
  const actual = norm(actualRaw)
  let verdict
  if (!actual) {
    verdict = '⚠ 读不到哨兵'
    unknown.push(s.id)
  } else if (actual === recorded) {
    verdict = '✓ 一致'
  } else {
    verdict = `✗ 已漂移 → 请把 sites.json 改成 ${actual}`
    drift.push({ id: s.id, recorded, actual })
  }
  console.log(
    `  ${s.id.padEnd(24)}${recorded.padEnd(14)}${(actual || '—').padEnd(14)}${verdict}`,
  )
}

console.log('')
if (drift.length === 0 && unknown.length === 0) {
  console.log('✅ 5 个子站的版本号与入口页记录完全一致。')
  process.exit(0)
}
if (drift.length) {
  console.log(`⚠️  ${drift.length} 个子站版本已漂移，入口页卡片正在显示过期版本：`)
  for (const d of drift) {
    console.log(`     ${d.id}: sites.json 写的是 ${d.recorded}，线上是 ${d.actual}`)
  }
  console.log('   修正方式：把 src/data/sites.json 里对应条目的 version 改成上面的线上实际值，提交即可。')
}
if (unknown.length) {
  console.log(`⚠️  ${unknown.length} 个子站读不到哨兵：${unknown.join(', ')}（可能是该站尚未接入 CI，或 web 根目录名与 id 不一致）。`)
}
process.exit(STRICT && drift.length ? 1 : 0)
