# 站群留言板后端（feedback-api）

一个进程服务 5 个站的读者留言：`llc` / `interleavedpfc` / `ahb` / `optical` / `web-training`。
widget 站有自己的单站版（`widget/server/index.mjs`，端口 8791），本服务不接管它。

---

## 一、为什么必须有服务端

「留言只有作者能看到」是一条**服务端**约束。任何把判断逻辑放进前端 JS 的做法，
等于把钥匙贴在门上；密码打进 bundle 更是明文可读（widget 站曾实测过 bundle 内
中文与参数全明文）。所以这里是一个真实的身份校验环节，且数据库不可匿名读。

选择自建而非托管 BaaS：数据留在自己机器、无第三方账号依赖、无免费额度到期风险、
代码可审计。代价是自己维护进程与备份 —— 本文就是为此而写。

## 二、架构

```
浏览器 ──HTTPS──▶ nginx（每站 vhost，443）
                    │
                    ├── location /            → /var/www/<site>（静态 dist）
                    └── location ^~ /api/     → 127.0.0.1:8792（本服务）
                                                    │  proxy_set_header X-Site <id>
                                                    └── SQLite /var/lib/feedback-api/data.db
```

| 项 | 值 |
|---|---|
| 代码 | `/opt/feedback-api/`（`index.mjs` / `sites.mjs` / `init-site.mjs`）|
| 数据 | `/var/lib/feedback-api/data.db`（目录 750，属主 `www-data`）|
| 服务 | `feedback-api.service`（systemd，`User=www-data`）|
| 监听 | `127.0.0.1:8792` —— **只监听回环**，公网无法直连 |
| 反代 | 各站 `/etc/nginx/sites-available/<site>` 里的 `location ^~ /api/` |
| 站点身份 | 由 nginx 注入的 `X-Site` 头决定，**后端不解析 Host** |

### 端口分配（同机共存，勿随意改）

| 端口 | 用途 |
|---|---|
| 8791 | widget-api（单站版，2026-11-02 上线）|
| 8792 | feedback-api（本站群五站共用）|
| 3000 / 6080 / 9222 | 已有其它进程（node / noVNC / chrome），不要占用 |

## 三、首次部署

```bash
# 1) 建目录
ssh root@43.142.148.37 'mkdir -p /opt/feedback-api /var/lib/feedback-api'

# 2) 上传（在本仓库 server/feedback-api 目录下执行）
tar czf - index.mjs sites.mjs init-site.mjs feedback-api.service \
  | ssh root@43.142.148.37 "tar xzf - -C /opt/feedback-api"

# 3) 属主与权限
ssh root@43.142.148.37 'chown -R www-data:www-data /opt/feedback-api /var/lib/feedback-api && \
  chmod 750 /var/lib/feedback-api'

# 4) 装服务
ssh root@43.142.148.37 'cp /opt/feedback-api/feedback-api.service /etc/systemd/system/ && \
  systemctl daemon-reload && systemctl enable --now feedback-api'

# 5) 验证
ssh root@43.142.148.37 'systemctl is-active feedback-api && curl -s http://127.0.0.1:8792/api/health'
```

nginx 端：把 `nginx-snippet.conf` 贴进**每个站的 443 服务 server 块**，
并把它里面的 `__SITE_ID__` 换成该站 id（见文件内的替换表）。

```bash
# 改完必须 -t 再 reload（同机还有别的站，不要 restart）
nginx -t && systemctl reload nginx
```

## 四、初始化管理员（**密码不经过任何人**）

本服务**不生成、不打印初始密码**。流程是「服务器发一次性令牌 → 人在浏览器里设密码」，
目的是让密码永远不经过终端回滚缓冲、日志或聊天记录。

```bash
# 为某站生成令牌（60 分钟有效，用一次即焚）
sudo -u www-data /usr/bin/node /opt/feedback-api/init-site.mjs --site llc

# 查看各站初始化状态
sudo -u www-data /usr/bin/node /opt/feedback-api/init-site.mjs --list
```

输出会给出**设置地址**（如 `https://www.llc.power-knowledge.tech/admin`）。
打开它 → 点「首次使用，或忘记密码？」→ 粘贴令牌 → 自己设定密码（至少 10 位）。

各站在册的后台地址：

| 站 | 后台地址 |
|---|---|
| llc | `https://www.llc.power-knowledge.tech/admin` |
| interleavedpfc | `https://www.interleavedpfc.power-knowledge.tech/#/admin`（该站是 HashRouter）|
| ahb | `https://www.ahb.power-knowledge.tech/admin` |
| optical | `https://www.optical.power-knowledge.tech/admin.html` |
| web-training | `https://www.web-training.power-knowledge.tech/admin/` |

**忘记密码**：重跑 `init-site.mjs --site <id>` 生成新令牌，走同一路径重置。
不要试图从数据库还原 —— 库里只有 scrypt 哈希。

日常改密码走后台「设置 / 修改密码」，无需登录服务器。

## 五、日常运维

```bash
journalctl -u feedback-api -n 50 --no-pager   # 最近日志
journalctl -u feedback-api -f                  # 实时跟随
systemctl restart feedback-api                 # 改 index.mjs 后必须重启
```

日志内容：每次 `/api/*` 的方法、路径、状态码、耗时；登录成功/失败；新增留言的
本站 id、id 与长度。**不打印密码、会话令牌或留言正文。**

### 备份（单文件 SQLite，WAL 模式下不要直接 cp）

```bash
sqlite3 /var/lib/feedback-api/data.db ".backup '/root/feedback-$(date +%F).db'"
```

若未装 `sqlite3`：先 `systemctl stop feedback-api`，再 `cp` 三个文件
（`data.db`、`data.db-wal`、`data.db-shm`），最后 `start`。建议 cron 每日一份、保留 14 天。

### 清空某站留言（不可恢复，先备份）

```bash
sqlite3 /var/lib/feedback-api/data.db "DELETE FROM messages WHERE site = 'llc';"
```

## 六、接口

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `GET` | `/api/health` | — | 存活探测（带 X-Site 时附带该站是否已初始化）|
| `POST` | `/api/feedback` | — | 公开提交，限流 + 蜜罐 |
| `POST` | `/api/admin/setup` | 一次性令牌 | 首次设定 / 重置密码 |
| `POST` | `/api/admin/login` | — | 登录，下发会话 Cookie |
| `POST` | `/api/admin/logout` | Cookie | 登出 |
| `GET` | `/api/admin/me` | Cookie | 当前身份 |
| `GET` | `/api/admin/messages` | Cookie | 列表，支持 `status`/`limit`/`offset` |
| `PATCH` | `/api/admin/messages/:id` | Cookie | 改状态 `new`/`read`/`archived` |
| `DELETE` | `/api/admin/messages/:id` | Cookie | 删除 |
| `POST` | `/api/admin/password` | Cookie | 改密码（吊销本站其它会话）|

## 七、新增一个站（checklist）

1. `sites.mjs` 的 `SITE_TABLE` 加一条（`name` / `hosts` / `adminPath` / `feedbackPath`）；
2. 该站 nginx 加 `location ^~ /api/`，`X-Site` 填新 id；
3. 重启 `feedback-api`（`SITE_TABLE` 是启动时加载的，热改不生效）；
4. `init-site.mjs --site <新id>` 生成令牌，在浏览器设定密码；
5. 前端接 `fetch('/api/…')` 同源调用即可，无需配置域名。

## 八、安全说明

- 密码：scrypt（N=16384, r=8, p=1），16 字节随机盐，参数写进哈希串便于日后升级；
- 会话：32 字节随机令牌，库里只存 SHA-256，7 天有效；改密后吊销本站其它会话；
- Cookie：`HttpOnly` + `SameSite=Strict` + `Secure`；**不设 Domain** —— 各子域天然隔离；
- 会话表带 `site` 列，读取时二次校验，令牌被挪用也跨不了站；
- CSRF：管理接口校验 `Origin` 属于该站在册域名；生产环境不认回环来源；
- 限流：登录 15 分钟 8 次；留言 10 分钟 5 条 / 24 小时 20 条；
- 隐私：不存明文 IP，只存加盐 SHA-256 前 32 位用于计数；
- 进程：`NoNewPrivileges` / `ProtectSystem=strict` / `ProtectHome` / `RestrictAddressFamilies` 等加固；
  刻意不加 `MemoryDenyWriteExecute`（V8 JIT 需要可写可执行内存，开了 Node 启动即崩）。

**未做，也不打算做**：邮件通知、验证码、多管理员、富文本。留言量级不需要，
每加一项都是新的攻击面。

## 九、故障排查

| 现象 | 排查方向 |
|---|---|
| 前端提示「留言服务尚未就绪（接口返回的不是 JSON）」| nginx 的 `location ^~ /api/` 没配或 `proxy_pass` 写错；此时请求被 `try_files` 回落成了 index.html |
| 前端提示「未知站点」| vhost 里漏了 `proxy_set_header X-Site <id>`，或 id 不在 `sites.mjs` 里 |
| 登录返回 403「来源不被允许」| 访问域名不在该站 `hosts` 里（例如用裸名而非 www，且裸名没配 301）|
| 登录一直 401 | 密码错；或 Cookie 没落地（检查是否 HTTPS —— `Secure` Cookie 在 HTTP 下不发送）|
| 登录后刷新又退出 | `SameSite=Strict` 导致跨站不发送；后台只能在正式域名用，GitHub Pages 镜像站不行 |
| 提交返回 429 | 触发限流，等窗口过期或重启服务清空内存计数 |
| 提交返回 413 | 请求体超 32k，检查 nginx `client_max_body_size` 与前端长度上限 |
| `/api/health` 返回 502 | 服务没起来：`systemctl status feedback-api`、`journalctl -u feedback-api -n 50` |
| 服务起不来，报 `SQLITE_CANTOPEN` | `/var/lib/feedback-api` 不存在或属主不对（`chown www-data` + `chmod 750`）|
