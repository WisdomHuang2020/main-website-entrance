'use strict'
/**
 * 站群未读留言聚合（只读）
 * ---------------------------------------------------------------------------
 * 目的：把 6 个公开站「status='new' 的留言条数」汇总成一份公开可读的 JSON，
 *       供入口门户 power-knowledge.tech 的站点卡片显示角标。
 *
 * 数据来自同一台机器上的两个 SQLite 库（实测 2026-11-07 线上均在线）：
 *   · /var/lib/feedback-api/data.db —— messages 表带 site 列，管 5 个站
 *   · /var/lib/widget-api/data.db   —— 单站表，无 site 列，只管 widget
 *
 * 为什么只读、且一律不碰那两个服务：
 *   · 留言正文、管理员哈希、会话令牌都在这两个库里，聚合层没有理由写它们；
 *   · 两个服务分别以 www-data 跑在 8792 / 8791，改动它们要重启、要回归，
 *     而本需求只要一个数字。用只读直连，改动面压到最小。
 *
 * ⚠️ 失败纪律（比成功路径更重要）：
 *   任何一个库打不开 / 查询失败 → **保留上一次的产物并以非零码退出**。
 *   绝不写一份「全 0」或「半份」数据 —— 那会让入口站看起来「没有新留言」，
 *   而真实情况是聚合挂了。前端另有新鲜度校验，超时后静默隐藏角标。
 *
 * 运行方式：systemd timer 每 60 秒调一次（oneshot），无端口、无常驻进程。
 * 本地干跑：
 *   FEEDBACK_DB=/tmp/feedback.db WIDGET_DB=/tmp/widget.db OUT=/tmp/unread.json node index.mjs
 */
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, writeFileSync, renameSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

const FEEDBACK_DB = process.env.FEEDBACK_DB || '/var/lib/feedback-api/data.db'
const WIDGET_DB = process.env.WIDGET_DB || '/var/lib/widget-api/data.db'
const OUT = process.env.OUT || '/var/lib/entrance-unread/unread.json'

/**
 * 站点清单必须与 server/feedback-api/sites.mjs 的 SITE_TABLE 保持一致。
 * ⚠️ 这里只列**已接入留言板**的 6 个公开站，不是 src/data/sites.json 的全部公开站：
 *    后者现为 9 个，control-mode / motor-lighting / english 没有留言板，故不在此列。
 *    2026-11-10 校正：旧注释写「与 6 个公开站保持一致」，在公开站增至 8 个后已失效，
 *    照旧口径添加站点会让聚合器去查不存在的留言库。
 * 单独列在这里而不是 import：服务器上只部署本目录，不部署前端 src/，
 * 也不该让一个只读统计脚本依赖留言服务的启动期模块。
 * 新增**接入留言板**的站时，本清单与 SITE_TABLE / 库初始化一起改（见 README）。
 */
const SITE_IDS = [
  'llc',
  'interleavedpfc',
  'ahb',
  'optical',
  'web-training',
  'widget',
]

/** 只读打开。readOnly + query_only 双保险：本进程永远不该产生一次写。 */
function openReadonly(path) {
  const db = new DatabaseSync(path, { readOnly: true })
  db.exec('PRAGMA query_only = ON')
  return db
}

function queryFeedback(db) {
  // messages.status 的取值域是 new / read / archived（feedback-api/index.mjs:316,742）
  const rows = db
    .prepare("SELECT site, COUNT(*) AS c FROM messages WHERE status = 'new' GROUP BY site")
    .all()
  const out = {}
  for (const r of rows) out[String(r.site)] = Number(r.c)
  return out
}

function queryWidget(db) {
  // 单站版没有 site 列（widget/server/index.mjs:270-279）
  const r = db
    .prepare("SELECT COUNT(*) AS c FROM messages WHERE status = 'new'")
    .get()
  return Number(r?.c ?? 0)
}

function main() {
  for (const p of [FEEDBACK_DB, WIDGET_DB]) {
    if (!existsSync(p)) throw new Error(`数据库不存在：${p}`)
  }

  const counts = Object.fromEntries(SITE_IDS.map((id) => [id, 0]))
  const sources = []

  const fb = openReadonly(FEEDBACK_DB)
  try {
    const bySite = queryFeedback(fb)
    for (const [site, c] of Object.entries(bySite)) {
      // 库里若出现清单外的 site（历史遗留 / 将来加了站没同步本表），
      // 不静默丢弃：直接报错，避免「有未读却不显示」这种最难发现的形态。
      if (!(site in counts)) throw new Error(`库中出现未登记的站点 id：${site}`)
      counts[site] = c
    }
    sources.push({ db: FEEDBACK_DB, sites: Object.keys(bySite).length })
  } finally {
    fb.close()
  }

  const wd = openReadonly(WIDGET_DB)
  try {
    counts.widget = queryWidget(wd)
    sources.push({ db: WIDGET_DB, sites: 1 })
  } finally {
    wd.close()
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const payload = {
    generatedAt: new Date().toISOString(),
    total,
    sites: counts,
  }

  // 原子写：先写同目录临时文件再 rename，nginx 任何时刻读到的都是完整 JSON。
  mkdirSync(dirname(OUT), { recursive: true })
  const tmp = `${OUT}.tmp`
  writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  renameSync(tmp, OUT)

  console.log(
    JSON.stringify({
      ok: true,
      total,
      nonzero: Object.entries(counts).filter(([, c]) => c > 0),
      sources,
      out: OUT,
    }),
  )
}

try {
  main()
} catch (err) {
  // 只打印错误摘要，不打印任何留言内容；产物保持上一轮的值不动。
  console.error(`[unread-aggregator] 聚合失败，未覆盖 ${OUT}：${err?.message || err}`)
  process.exitCode = 1
}
