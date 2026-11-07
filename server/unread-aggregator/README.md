# 站群未读留言聚合（unread-aggregator）

给入口门户 `power-knowledge.tech` 提供 `GET /api/unread`：6 个公开站各自
`status='new'` 的留言条数，供站点卡片显示角标。

---

## 一、为什么是「只读聚合」而不是改现有服务

| 现状（2026-11-07 实测） | 值 |
|---|---|
| 5 站共用服务 | `feedback-api :8792`，库 `/var/lib/feedback-api/data.db`，`messages` 带 `site` 列 |
| widget 独立服务 | `widget-api :8791`，库 `/var/lib/widget-api/data.db`，单站表无 `site` 列 |
| 两库统一语义 | `messages.status` ∈ `new` / `read` / `archived`；`new` 即「未查看」 |
| 入口站已有范式 | `location = /api/version/<id>` 用 `alias` 直读文件、`no-store`，前端 `useLiveVersions` 渐进增强 |

跨两个库取一个数，有三条路：**改 8792 去连 8791**（要重启、要回归、耦合两个服务）、
**把 widget 迁进统一库**（要迁移客户数据，风险最大）、**新增一个只读统计层**。
选第三条：不碰两个服务、不碰 6 个子站、不迁移任何数据、无常驻进程、无新端口。

## 二、数据链路

```
feedback-api /var/lib/feedback-api/data.db ┐
                                           ├─ 只读 SELECT ─▶ unread.json ─▶ nginx alias ─▶ /api/unread
widget-api   /var/lib/widget-api/data.db  ┘   (每 60s)      /var/lib/      (= 精确匹配)
                                                            entrance-unread/
```

| 组件 | 位置 |
|---|---|
| 代码 | `/opt/entrance-unread/index.mjs` |
| 产物 | `/var/lib/entrance-unread/unread.json`（目录 755、文件 644）|
| 单元 | `unread-aggregator.service`（oneshot）+ `.timer`（60s）|
| nginx | `entrance` vhost 的 `location = /api/unread` |

产物格式（`sites` 固定含 6 个 id，为 0 也保留 —— **由前端决定不渲染 0**）：

```json
{
  "generatedAt": "2026-11-07T02:30:00.000Z",
  "total": 3,
  "sites": {
    "llc": 2, "interleavedpfc": 0, "ahb": 0,
    "optical": 1, "web-training": 0, "widget": 0
  }
}
```

## 三、🔴 隐私边界（用户 2026-11-07 拍板）

**这个端点是公开的，任何访客都能读到各站未读留言的条数。** 它不返回留言正文、
联系方式、IP、时间、任何一条记录的内容，只返回非负整数与生成时间。

用户明确选择「公开显示非零数量、0 不显示」，并同意同步修改首页隐私措辞。
因此首页那句「留言只有本人能看到」已改为区分两件事：**留言内容仅作者可见，
未读数量在入口站公开提示**。改动前不要再按「留言完全私有」的旧口径设计。

## 四、「已查看」怎么清零

不新增任何状态。管理员在任一子站后台把留言 `PATCH` 成 `read`（或 `archived`），
下一轮聚合（≤60 秒）里该条就不再计数，角标自动消失。
**不存在第二套「已读」语义** —— 入口站不记录 `lastSeen`，不做「点一下消掉」。

## 五、失败纪律

| 情况 | 行为 |
|---|---|
| 任一库不存在 / 打不开 / 查询失败 | **不覆盖旧产物**，写错误日志，进程退出码 1 |
| 库里出现清单外的 `site` | 直接报错退出（防止「有未读却不显示」这种最难发现的形态）|
| 聚合停摆超过 10 分钟 | 前端校验 `generatedAt` 新鲜度失败 → **静默隐藏全部角标**，不显示陈旧数字 |
| `/api/unread` 404 / 返回 HTML / 网络失败 | 前端静默降级（本地 dev、GitHub Pages 兜底通道都会走这里）|

绝不写「全 0」或「半份」数据。显示 0 与「聚合挂了」在界面上长得一样，
但含义相反 —— 宁可不显示，也不能让作者误以为没有新留言。

## 六、部署

```bash
cd <仓库根>
bash server/unread-aggregator/deploy.sh --check   # 只读体检，不改任何东西
bash server/unread-aggregator/deploy.sh           # 全量部署（幂等）
```

脚本会：核对 Node ≥ 22.5 与两个库可读 → 上传（文件式 scp，不用 tar 管道）→
装 timer 并生成首份产物 → **只往 entrance vhost 注入一个精确 location**
（先备份到 `/root/nginx-backup-unread-*/`，`nginx -t` 不过就逐字节还原）→
`reload`（不是 restart）→ 公网 `curl` 验收。

⚠️ `deploy/nginx-entrance.conf` 是仓库内的**权威配置**，但 CI 只发 `dist`，
**不会部署 nginx 配置**。deploy.sh 采用注入而非整份覆盖，就是为了避免冲掉服务器上
可能存在的、仓库之外的本地改动。改配置时两边都要留意。

## 七、运维

```bash
systemctl list-timers unread-aggregator.timer      # 下次执行时间
systemctl start unread-aggregator.service          # 立刻重算一次
journalctl -u unread-aggregator.service -n 50 --no-pager
cat /var/lib/entrance-unread/unread.json
curl -s https://power-knowledge.tech/api/unread
```

日志只打印总数与各站计数，**不打印留言正文**。

## 八、新增 / 移除一个公开站

四处必须同步，漏一处就会出现「站点存在但角标永远不亮」或「库里多了个 id 导致聚合报错」：

1. `src/data/sites.json` —— 门户卡片清单（单一真源）
2. `server/feedback-api/sites.mjs` —— 若该站接入统一留言服务
3. `server/unread-aggregator/index.mjs` 的 `SITE_IDS`
4. `deploy/nginx-entrance.conf` 的 `/api/version/<id>`（若该站有哨兵）

## 九、验收清单

- [ ] `curl https://power-knowledge.tech/api/unread` 返回 200、`content-type: application/json`、`total` 存在
- [ ] 有未读的站显示角标，为 0 的站**不显示 0**
- [ ] 子站后台标记已读后，≤60 秒角标数字减少
- [ ] GitHub Pages 兜底通道无角标、无报错、无骨架屏
- [ ] 同机其它 8 个站仍 200（reload 没波及别人）
- [ ] `systemctl is-enabled unread-aggregator.timer` = enabled
