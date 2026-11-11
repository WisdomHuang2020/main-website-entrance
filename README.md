# Know-How·Tools·Skills·Systems · 站群入口门户

`power-knowledge.tech` 的入口页 —— 把站群内的在线计算工具、实训课程与语言学习站收在一处，作为统一门面。

- **正式地址**：https://power-knowledge.tech/ （别名 https://www.power-knowledge.tech/）
- **兜底通道**：https://wisdomhuang2020.github.io/main-website-entrance/

## 收录的站点

| 序号 | 站点 | 域名 | 主色 |
|---|---|---|---|
| 01 | LLC 谐振变换器设计工具 | `llc.power-knowledge.tech` | `#115e59` |
| 02 | 交错并联 Boost PFC 设计工具 | `interleavedpfc.power-knowledge.tech` | `#0f766e` |
| 03 | 开关变换器 · 建模与控制 | `www.control-mode.power-knowledge.tech` | `#0f766e` |
| 04 | 光学概念和光学设计 | `optical.power-knowledge.tech` | `#14b8a6` |
| 05 | 电源与照明工程计算器 | `widget.power-knowledge.tech` | `#2dd4bf` |
| 06 | 网站建设实训课（课程，非计算工具） | `web-training.power-knowledge.tech` | `#0f766e` |
| 07 | AHB 不对称半桥反激设计工具 | `ahb.power-knowledge.tech` | `#0d9488` |
| 08 | 二轮车照明配光技术站 | `www.motor-lighting.power-knowledge.tech` | `#0f766e` |
| 09 | 外贸英语 · 邮件英语学习站 | `english.power-knowledge.tech` | `#0f766e` |

主色列取各站自己的品牌主色（`--color-brand` 或 `--color-primary`），即 `src/data/sites.json` 的 `accent`。
**本节曾在 2026-10-31 校正过一次**：此前表格里 interleavedpfc / ahb / widget 三行写的是
`#2563eb` / `#0f766e` / `#0e7490`，与实际 `accent` 不一致（属文档漂移，改新行时一并修正）。

**2026-11-10 再校正一次**：表格此前只列 6 行，而 `sites.json` 实有 8 个公开站
（control-mode 与 motor-lighting 于 11-02 / 11-09 接入后没回填表格）；本次接入 english 后一并对齐为 9 行。
现在表格带**序号列**：序号 = 卡片右上角幽灵数字 = 该站在 `SITES` 中的下标 + 1
（渲染顺序就是数组顺序，中间无排序覆盖）。用序号讨论站点时以本表为准，
避免「english 挪位后其余卡片整体前移一位」造成的口径歧义。

⚠️ **排序约定（用户 2026-11-10 明确要求，长期生效）**：没有特别注明时**按上线时间排序**，
新站追加到清单末尾。english 是当日最新上线的公开站，故排 09。
同日用户两次**特别注明**对调（均以当时的清单序号为准，用户已确认第二次按字面执行）：
· 第一次：05 ↔ 08，即 `widget` ↔ `motor-lighting`；
· 第二次：03 ↔ 07 与 05 ↔ 08 各对调一次，故 03 = 开关变换器 · 建模与控制、
  07 = AHB 不对称半桥反激设计工具；05 / 08 同时换回 05 = 电源与照明工程计算器、
  08 = 二轮车照明配光技术站。
这些都是显式指定的既成事实，**不要**按上线时间擅自「纠正」回去；用序号讨论前先确认按哪份清单。

`web-training` 的对外写法与其余八行一致（`web-training.power-knowledge.tech`），
但它的**实际服务域带 `www.` 前缀**（`www.web-training.power-knowledge.tech`），证书因此单独签发。
裸名访问会 **301 跳到带 `www.` 的地址**（2026-11-02 实测：301 → www，跟随 1 跳后 200）。

2026-11-02 起卡片也改为显示裸名，`sites.json` 的 `domain` / `url` 同步为裸名。
此前显示带 `www.` 的版本共 38 字符，在 1440px 下会被 `truncate` 截尾；改裸名后 34 字符完整显示，
且与其余八行的写法统一。点击后仍会跟随一次 301（与 llc / interleavedpfc / ahb 三站同构）。

各站点的内容、计算口径与免责声明以对应站内的说明为准；本站只做导航。

### 内网系统（第二入口 `/internal`）

| 系统 | 域名 | 主色 | 版本 | 版本的核实依据 |
|---|---|---|---|---|
| 评鉴测试报告系统 | `validation.power-knowledge.tech` | `#0070c0` | **1.23.1** | 服务器 `.deployed-version`，门户 `/api/version/validation-test` 实时读取（2026-11-11 实测） |
| 电源型号编码生成器 | `psu-model.power-knowledge.tech` | `#0f766e` | **1.15.0** | 服务器 `.deployed-version`，门户 `/api/version/psu-model` 实时读取（2026-11-11 实测） |
| LED光色电平衡配比系统 | `smartbin.power-knowledge.tech` | `#2563eb` | **0.5.0** | 子站运行时 `/api/health`，门户 `/api/version/smartbin` 同源代理后实时读取（2026-11-11 19:10 实测）；静态快照同步为 0.5.0 供 Pages 兜底 |
| IO · 团队内部站点入口 | `io.wx-seastar.cn` | `#0e7490` | **1.0.0** | `sites.json` 静态记录；无哨兵、无端点，人工维护 |

> 表格此前只列 2 行，2026-11-10 补齐为 3 行；2026-11-11 接入 smartbin 后再补第 4 行。
> 按用户 11-11 确认，`io` 仍是内网清单**最后一位**，smartbin 排在它之前（排序约定的显式例外）。
> 版本列的两个旧值（1.16.1 / 1.2.1）是 11-11 之前的静态快照，现已改走实时端点，一并校正。
> `smartbin` 是 Next.js 站，没有自定义 `--color-primary`；登录页主色为 slate-900 `#0f172a`，
> 实测在门户深色主题下卡片图标几乎不可辨（2026-11-11 截图确认），故 `accent` 取门户内网蓝
> `#2563eb` —— 属门户侧取值，不是从子站读来的主色，别按「accent 必须等于子站主色」改回去。

这四个系统**需要账号与密码登录、不对公众开放**（未登录访问任一系统都会被拦到 `/login`），因此：

- 首页「工具与学习站」只列上面 9 个公开站（`SITES`），内网站只在 `/internal` 这一层列（`INTERNAL_SITES`）；
- 首屏四条统计的口径限定为**公开站** —— 否则「使用门槛 0 项」会与内网系统的登录门禁自相矛盾；
- `validation-test` / `psu-model` 走 `.deployed-version` 哨兵、`smartbin` 走运行时
  健康接口，三站都有门户 `/api/version/<id>` 端点，卡片运行时读实时值；`io` 没有端点，
  显示 `sites.json` 静态值。
  ⚠️ **smartbin 是端点契约的例外**（2026-11-11 19:10 起）：它的 `deploy/push.sh`
    不写哨兵、`deploy/audit-version-sync.py` 也不检查哨兵，当日 19:02 发到 0.5.0 后
    哨兵仍停在 17:06 手工写的 0.3.1，门户便一直显示旧号。改为 nginx `proxy_pass`
    到 `127.0.0.1:3311/api/health`，`useLiveVersions` 兼容 `{ version }` JSON 响应，
    数据源是运行中的应用本身，子站发版后门户自动跟上；服务重启瞬间端点可能 502，
    前端静默回退静态值。其余各站仍是哨兵纯文本，别把这条改回 `alias` 哨兵。
  ⚠️ **v1.8.10 才真正接通内网页**：此前 `useLiveVersions` 只在首页公开站卡片墙被消费，
     `/internal` 的 `InternalPage` 直接传 `site.version`，端点形同虚设。2026-11-11
     smartbin 16:47 发版 0.3.0、线上 `/internal` 仍显示 0.2.2，实测暴露后改由 App
     把 `liveVersions` 传入 InternalPage。别再把这行改回静态值。
  `scripts/check-versions.mjs` 仍显式跳过**全部** internal 站点，不与公开站混在同一套漂移巡检里
  （跳过是为了不制造「未找到哨兵」的假告警，见该脚本注释）。
  ⚠️ **`io` 发新版后要手动改 `sites.json` 的 `version`** —— 没有自动同步，这是已知缺口。
  ⚠️ 门户 nginx 的端点定义在本仓库 `deploy/nginx-entrance.conf`，但 **CI 只发 `dist`**，
     新增/修改端点必须手工同步到服务器，否则线上仍是 200 + HTML、前端静默降级到静态值。
- 前三站的 `id` 等于服务器 web 根目录名（`/var/www/validation-test`、`/var/www/psu-model`、
  `/var/www/smartbin`），与公开站同一约定；`io` 是挂独立域名的团队门户，不走站群 web 根。
- 2026-11-07 接入时，validation-test 尚未写哨兵；2026-11-11 起三站已全部接入实时端点
  （其中 smartbin 走运行时健康接口，不依赖哨兵文件）。

## 外贸英语学习站（2026-11-10 接入，第一入口第 9 张卡片 · 序号 09）

`english.power-knowledge.tech` 是站群里第一个语言学习站，也是**唯一没有版本哨兵的公开站**。
以下取值均为 2026-11-10 实测，不是推测：

| 项 | 实测值 | 依据 |
|---|---|---|
| 跳转 | 裸名 301 → `www.english.power-knowledge.tech` | `curl -I https://english.power-knowledge.tech/` |
| 版本 | `1.0.0`（三段式、不带 `v`） | 站内页脚 `<span class="app-version">v1.0.0</span>` |
| 主色 | `#0f766e` | 站内 `assets/css/theme-vars.css` 的 `--color-brand` / `--color-primary` |
| web 根 | `/var/www/english` ⇒ `id = english` | 服务器只读实测 |
| 版本哨兵 | **不存在** | 服务器 `/var/www/english/.deployed-version` 无；该站 `deploy/update.sh` 不写哨兵 |

由此产生的三个后果，排查时别误判成故障：

1. 卡片显示的是 `sites.json` 的**静态版本**。`useLiveVersions` 请求 `/api/version/english`
   得 404（门户 nginx 已按惯例配好精确端点，但 alias 目标文件不存在），静默降级，不显示假版本号。
2. `scripts/check-versions.mjs` 会把它列成「读不到哨兵」告警。非 `--strict` 时不影响退出码，
   属**已知且预期**；与内网系统「显式跳过」的处理不同，别把两者混为一谈。
3. 该站发新版后**必须手工**同步 `sites.json` 的 `version`，否则卡片挂过期号 —— 和内网系统同一缺口。

若要纳入实时版本体系，须在 english 站的 CI / `deploy/update.sh` 写出三段式哨兵，
并把 `deploy/nginx-entrance.conf` **手工**同步到服务器（本仓库 CI 只发 `dist`，不部署 nginx）。

## 2026-11-10 内容口径审阅（english 接入后的连带更新）

english 是站群第一个语言学习站。接入后入口页有一批「只讲电源/光学、默认全是工程计算工具」的
旧文案会把新站排除在外，本次一并校正。**不改 URL、不改卡片顺序、不改站点清单**：

| 位置 | 旧口径 | 新口径 |
|---|---|---|
| 首屏眉标药丸 | 电源 · 光学 · 信息技术 | 电源 · 光学 · 信息技术 · **商务英语** |
| 首屏主标题 | 直达全部工程工具与课程 | 直达全部工具与学习站 |
| 首屏描述 | 电源与光学工具 + 信息技术实训课 | 补上建模与控制培训页、外贸邮件英语学习站 |
| 区块标题 / 导航 label | 工具与课程 | 工具与学习站（深链 `/tools` 与 DOM id `tools` 均未变） |
| 「共同的工程口径」 | 默认九站都有计算与公式 | 前两条限定「计算类工具」，内容站按站内说明标注出处与筹备进度 |
| 页脚免责声明 | 默认全部工具都有计算结果 | 计算工具 与 课程/语言学习资料 分开表述 |
| `index.html` SEO | 只列电源/光学工具与实训课 | 补全至 9 站范围，含外贸英语学习站 |

眉标之所以写「商务英语」而非泛称「英语」：该站范围是外贸询盘／报价／订单／索赔邮件，
不是通用英语教学；与「信息技术」同为四字，药丸读起来也齐整。

同时把 `sites.json` 与 `deploy/sites.yml` 的**静态版本快照**校准到 2026-11-10 服务器实测值：
`llc 3.3.1 / interleavedpfc 1.3.0 / ahb 2.3.1 / optical 4.6.0 / motor-lighting 3.0.4 /
web-training 2.4.2 / control-mode 1.4.3 / widget 2.3.1`；english 无哨兵，仍为 `1.0.0`。
这些值只是兜底：线上卡片版本由 `/api/version/<id>` 读服务器哨兵覆盖，端点失败时才用静态值，
所以同步它们不会改变线上显示。`deploy/sites.yml` 的「最后核对」日期与内网表格的
第 3 个系统 `io`（11-09 接入）、「其余五行」等旧计数也一并对齐。

## 新增一个子站

> **排序约定（2026-11-10 起，长期生效）**：没有特别注明时，**按上线时间排序** ——
> 新站追加到 `sites.json` 对应清单的末尾，不要插到前面。
> 渲染顺序 = 数组顺序，卡片序号 = 下标 + 1，所以新站自然拿到当前最大序号。
> 需要置顶、指定第 N 位或两站对调时，用户会明确注明；没注明就一律追加末尾。
> 对调过的站点属于「已特别注明」的既成事实，不要按上线时间擅自复原。

1. 改 **`src/data/sites.json`** —— 这是站点清单的单一数据源，卡片、数量统计、版本徽标都读它。
2. 字段约定：
   - `id` 必须等于该站在服务器上的 web 根目录名（巡检脚本按 `/var/www/<id>/.deployed-version` 取版本）。
   - `version` 写**不带 `v`** 的纯语义化版本号，渲染时统一补 `v`（见 `src/data/sites.ts` 的注释）。
     必须**三段式 `x.y.z`**：`useLiveVersions` 的取值正则只认 `^v?(\d+\.\d+\.\d+)$`，
     子站哨兵若写成两段式（如 `v1.0`）会被静默丢弃、卡片退回静态值，而且不报任何错。
   - `accent` 取该站自己的 `--color-primary`，让卡片点缀色与子站一致。
3. 若新子域要用 `www.` 别名，**必须先重签证书**：当前通配符 `*.power-knowledge.tech` 只覆盖一级子域，
   且各 `www.` 名称是逐个手工附加进 SAN 的，不是通配符带来的。

## 本地开发

```bash
npm install
npm run dev            # 开发预览
npm run build          # tsc --noEmit && vite build
npm run preview        # 预览构建产物

npm run verify:version # 版本号单一来源门禁（CI 硬门禁）
npm run check:versions -- --host 43.142.148.37 --key ~/.ssh/pfc_ci   # 子站版本漂移巡检
```

## 版本号约定（不要绕开）

唯一来源是 `package.json` 的 `version`，由 `vite.config.ts` 的 `define` 注入为全局常量
`__APP_VERSION__`，页头徽标与页脚各渲染一次同一个常量。`scripts/verify-version.mjs`
会断言「没有任何地方硬编码 `vX.Y.Z`」且「两个显示点都引用同一常量」。
**改版本号 = 只改 `package.json`。**

## 两处容易踩的坑

1. **`base: './'` 不能改成 `'/'`。**
   同一份 `dist` 要同时服务根路径（自有域名）与子路径（GitHub Pages）。改成绝对路径会让
   Pages 通道整站白屏。
2. **入口页的 nginx 与 LLC 站的 `server_name` 有互斥关系。**
   `power-knowledge.tech` / `www.power-knowledge.tech` 这两个名字在改造前挂在 LLC 站的
   server 块上。既然它们现在归入口页，就必须从 LLC 站的配置里删掉 ——
   两个 server 块声明同一个 `server_name` 会触发 nginx `conflicting server name` 警告，
   匹配顺序变得不可预期。

## 站群留言板后端（`server/feedback-api/`）

本站是纯静态门户，但**站群**自 2026-11-02 起不再全静态：六个工具/课程站各加了
「读者留言」，留言的可见性必须在服务端判定，因此有一个自建 Node 服务。

它放在本仓库，是因为入口站是站群的协调点（nginx 里的 `/api/version/<id>` 与
`/api/unread` 端点都在这里），而不是因为本站自己用到了这套留言服务 ——
入口页只取同源的静态端点（nginx `alias` 直读文件），不经过 8792 / 8791 两个 Node 服务。

| 项 | 值 |
|---|---|
| 代码 | `server/feedback-api/`（`index.mjs` / `sites.mjs` / `init-site.mjs`）|
| 部署位置 | 服务器 `/opt/feedback-api/`，systemd 单元 `feedback-api.service` |
| 监听 | `127.0.0.1:8792`，由各站 nginx 的 `location ^~ /api/` 反代 |
| 接入站点 | llc / interleavedpfc / ahb / optical / web-training（widget 另有单站版，端口 8791）|

部署、初始化管理员（一次性令牌，密码不经过聊天记录）、备份与排障，
全部写在 **`server/feedback-api/README.md`**，改动前先读它。

⚠️ 本仓库的 CI **只发布 `dist`**，不会部署 `/opt/feedback-api`。
后端代码变更须按上述 README 手工同步到服务器，否则前端会报「留言服务尚未就绪」。

## 站群未读留言角标（`server/unread-aggregator/`）

2026-11-07 起，首页 6 个**已接入留言板**的站点卡片在「该站有未读留言」时显示数字角标（公开站现为 9 个，其余 3 个未接留言板，不参与角标），
**为 0 的站不显示 0**。数据链路与 `useLiveVersions` 同型：

```
两个留言库 ──只读统计(60s)──▶ /var/lib/entrance-unread/unread.json
                                    │ nginx alias（同源、no-store）
                                    ▼
                           GET /api/unread ──▶ src/data/useUnread.ts ──▶ SiteCard 角标
```

| 项 | 口径 |
|---|---|
| 「未查看」定义 | 两个库统一的 `messages.status = 'new'`；在子站后台标记 `read` / `archived` 后 ≤60 秒角标自动消失 |
| 6 站来源 | `feedback-api` 管 5 站（库带 `site` 列）+ `widget-api` 单站库 |
| 清零机制 | **无第二套状态**，入口站不记 `lastSeen`，不支持「点一下消掉」 |
| 隐私边界 | 🔴 **未读数量对全体访客公开**（不含留言正文、联系方式、任何一条记录内容）。首页文案已相应改为「留言内容仅本人可见，入口站只公开提示各站是否有新留言」 |
| 降级 | 端点 404 / 返回 HTML / 聚合停摆超 10 分钟 → 静默隐藏全部角标。GitHub Pages 兜底通道无此端点，天然不显示 |

部署与验收见 **`server/unread-aggregator/README.md`**；nginx 端点定义在
`deploy/nginx-entrance.conf`。CI 只发 `dist`，这两处都须手工同步到服务器。

## 部署链路

- `deploy-lighthouse.yml` —— 正式域名。需要仓库 secrets：`LH_HOST` / `LH_USER` / `LH_ROOT`
  （`/var/www/entrance`）/ `LH_SSH_KEY` / 可选 `LH_PORT`。未配置时**优雅跳过**（job 仍显绿，
  属假绿），因此判断是否真的部署了必须下钻到步骤级看 `Deploy to server over SSH` 是 success 还是 skipped。
- `deploy.yml` —— GitHub Pages 兜底，与上者并行独立。
- 服务器侧细节与站群对照表见 `deploy/sites.yml`（文档性质，不被工作流解析）。
