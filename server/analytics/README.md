# analytics —— 站群访问量后台

`https://power-knowledge.tech/admin` 的数据与认证服务。

## 它是什么

一个单文件 Node 服务（无第三方依赖），做两件事：

1. **统计各子站的 PV / UV** —— 解析 `/var/log/nginx/*.access.log`，按站聚合、按天分桶；
2. **后台登录** —— admin + scrypt 密码哈希，会话是 HMAC 签名的过期时间戳，走 HttpOnly cookie。

## 为什么不用前端埋点

| 方案 | 要改子站 | 数据可信度 | 被拦截风险 |
|---|---|---|---|
| 前端 `sendBeacon` 上报 | 10 个站全要改并发版 | 可被伪造 | 广告拦截器会拦 |
| **nginx access log**（本方案） | **零改动** | 服务端原始记录 | 无 |

## 统计口径（口径写死在代码里，前端不再算）

- **PV**：每天的**文档请求**数。计入 `GET /`、`GET /path`、`GET /path/`、`GET /x.html`。
- **UV**：同口径下的独立 IP 数。
- **排除**：静态资源（js/css/图片/字体/map）、`/api/*`、非 2xx/3xx、以及 UA 匹配
  `bot|spider|crawler|slurp|headless|curl/|wget/|python-requests` 等爬虫与脚本。
- 保留天数上限 14（与 `logrotate` 的 `rotate 14` 对齐）。

> 注：UV 是「IP 数」，不是真实人数 —— 同一出口 IP 的多个用户会合并。这是不用
> cookie/指纹换来的代价，换来的是零采集、零隐私负担。

## 部署

```bash
# 1) 目录与文件
mkdir -p /opt/entrance-analytics /etc/entrance-admin
scp server/analytics/index.mjs            root@host:/opt/entrance-analytics/
scp src/data/sites.json                   root@host:/etc/entrance-admin/sites.json
scp server/analytics/analytics.service    root@host:/etc/systemd/system/entrance-analytics.service

# 2) 数据目录归属（服务以 www-data 运行，要能写凭据文件）
chown -R www-data:www-data /etc/entrance-admin
chmod 700 /etc/entrance-admin
chmod 600 /etc/entrance-admin/sites.json

# 3) 首次启动（unit 里的 ADMIN_INIT_PASSWORD 决定初始密码，之后改密码走后台）
systemctl daemon-reload
systemctl enable --now entrance-analytics

# 4) nginx：见 nginx-snippet.conf（/api/admin/ 反代 + motor-lighting 补 access_log）
nginx -t && systemctl reload nginx
```

## 改密码

后台页面底部「修改密码」：需要当前密码，新密码至少 8 位。
改密码会**轮换会话密钥**，其它设备上的旧会话立即失效，当前设备自动续期。

忘记密码时（有 root 权限）：

```bash
rm /etc/entrance-admin/credentials.json
# 改 unit 里的 ADMIN_INIT_PASSWORD，或留空让它随机生成
systemctl restart entrance-analytics
journalctl -u entrance-analytics -n 20   # 随机密码会打印在这里
```

## 已知限制

- **`io` 统计不到**：它跑在另一台服务器（47.82.x），本机 nginx 日志里没有它的请求。
  要统计它得在那台机器上另部署一份采集，再汇总过来。
- 日志按天轮转，跨天边界（00:00 前后）的请求归属以日志行内的时间戳为准，不受轮转影响。
- 单次全量解析约几百毫秒，结果缓存 5 分钟；`?days=` 变化会绕过缓存重算。

## 多台服务器的日志汇总（香港站）

`io` / `magnetics` / `pm` / `skills` / `spice` / `xsk` / `zxj` 跑在香港那台
（`47.82.96.119`，实例名 `aliyun-wisdom`），本机没有它们的日志。

**做法：主服务器主动拉过来，与本地日志合并统计**，不在那台另跑一套服务。

```
/usr/local/bin/sync-remote-logs.sh        # tar czf 流 → /var/log/nginx-remote/
entrance-log-sync.{service,timer}         # 每 10 分钟
```

analytics 侧只需 `LOG_DIRS=/var/log/nginx,/var/log/nginx-remote`（默认值已含两者），
`scanLogFiles()` 会扫所有目录，站点 id 仍由文件名决定。

### 三个实测结论（别再走回头路）

1. **不能用 rsync**：在这条链路上会卡在 generator 阶段并收到 SIGTERM / Broken pipe。
   换 `tar czf - | tar xzf -` 一次就通。
2. **必须 gzip**：该机带宽小，7.3 MB 原始日志传不完（4 分钟超时）；日志文本压缩比约 10:1，
   压缩后 0.8 MB，40 秒完成。
3. 只取 `*.access.log*`，**不取全局 `access.log`** —— 那是未匹配 Host 的兜底日志，不归属任何站。

### 凭据

私钥 `/root/.ssh/ymgd-io.pem`（600 root）。analytics 以 www-data 运行，读不到它 ——
同步由 root 的 timer 执行，服务只读已落地的日志，权限隔离是有意的。

> ⚠️ 原 `D:/AI Using\Web\IO\网站部署信息表.txt` 里明文贴着整段 RSA 私钥，
> 已提醒用户删除。私钥只需存在主服务器与部署者本地的 pem 文件里。
