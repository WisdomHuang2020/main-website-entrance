# Know-How·Tools·Skills · 站群入口门户

`power-knowledge.tech` 的入口页 —— 把站群内的在线工具与实训课程收在一处，作为统一门面。

- **正式地址**：https://power-knowledge.tech/ （别名 https://www.power-knowledge.tech/）
- **兜底通道**：https://wisdomhuang2020.github.io/main-website-entrance/

## 收录的站点

| 站点 | 域名 | 主色 |
|---|---|---|
| LLC 谐振变换器设计工具 | `llc.power-knowledge.tech` | `#115e59` |
| 交错并联 Boost PFC 设计工具 | `interleavedpfc.power-knowledge.tech` | `#0f766e` |
| AHB 不对称半桥反激设计工具 | `ahb.power-knowledge.tech` | `#0d9488` |
| 光学概念和光学设计 | `optical.power-knowledge.tech` | `#14b8a6` |
| 电源与照明工程计算器 | `widget.power-knowledge.tech` | `#2dd4bf` |
| 网站建设实训课（课程，非计算工具） | `web-training.power-knowledge.tech` | `#0f766e` |

主色列取各站自己的 `--color-primary`，即 `src/data/sites.json` 的 `accent`。
**本节曾在 2026-10-31 校正过一次**：此前表格里 interleavedpfc / ahb / widget 三行写的是
`#2563eb` / `#0f766e` / `#0e7490`，与实际 `accent` 不一致（属文档漂移，改新行时一并修正）。

`web-training` 的对外写法与其余五行一致（`web-training.power-knowledge.tech`），
但它的**实际服务域带 `www.` 前缀**（`www.web-training.power-knowledge.tech`），证书因此单独签发。
裸名访问会 **301 跳到带 `www.` 的地址**（2026-11-02 实测：301 → www，跟随 1 跳后 200）。

2026-11-02 起卡片也改为显示裸名，`sites.json` 的 `domain` / `url` 同步为裸名。
此前显示带 `www.` 的版本共 38 字符，在 1440px 下会被 `truncate` 截尾；改裸名后 34 字符完整显示，
且与其余五行的写法统一。点击后仍会跟随一次 301（与 llc / interleavedpfc / ahb 三站同构）。

各站点的计算口径与免责声明以对应站内的说明为准；本站只做导航。

### 内网系统（第二入口 `/internal`）

| 系统 | 域名 | 主色 | 版本 | 版本的核实依据 |
|---|---|---|---|---|
| 评鉴测试报告系统 | `validation.power-knowledge.tech` | `#0070c0` | **1.16.1** | 服务器 `/var/www/validation-test/app/package.json`（与仓库 tag `v1.16.1` 一致） |
| 电源型号编码生成器 | `psu-model.power-knowledge.tech` | `#0f766e` | **1.2.1** | 服务器 `/var/www/psu-model/index.html` 内嵌版本 + 仓库 `VERSION` 文件 |

这两个系统**需要账号与密码登录、不对公众开放**（未登录访问任一系统都会被拦到 `/login`），因此：

- 首页「工具与课程」只列上面 6 个公开站（`SITES`），内网站只在 `/internal` 这一层列（`INTERNAL_SITES`）；
- 首屏四条统计的口径限定为**公开站** —— 否则「使用门槛 0 项」会与内网系统的登录门禁自相矛盾；
- 它们**没有** `.deployed-version` 哨兵，门户也**没有**给它们配 `/api/version/<id>` 端点，
  所以卡片显示的是 `sites.json` 里的静态版本值，`scripts/check-versions.mjs` 会显式跳过它们
  （跳过是为了不制造「未找到哨兵」的假告警，见该脚本注释）。
  ⚠️ **内网系统发新版后要手动改 `sites.json` 的 `version`** —— 没有自动同步，这是已知缺口。
- `id` 仍等于服务器 web 根目录名（`/var/www/validation-test`、`/var/www/psu-model`），与公开站同一约定。
- 2026-11-07 接入时，validation-test 尚未写哨兵；若日后给两个内网系统补上哨兵与门户端点，
  这里可以改回实时读取。

## 新增一个子站

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

本站是纯静态门户，但**站群**自 2026-11-02 起不再全静态：五个工具/课程站各加了
「读者留言」，留言的可见性必须在服务端判定，因此有一个自建 Node 服务。

它放在本仓库，是因为入口站是站群的协调点（nginx 里的 `/api/version/<id>` 端点也在这里），
而不是因为本站自己用到了它 —— **入口页自身不调用任何后端接口**。

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

## 部署链路

- `deploy-lighthouse.yml` —— 正式域名。需要仓库 secrets：`LH_HOST` / `LH_USER` / `LH_ROOT`
  （`/var/www/entrance`）/ `LH_SSH_KEY` / 可选 `LH_PORT`。未配置时**优雅跳过**（job 仍显绿，
  属假绿），因此判断是否真的部署了必须下钻到步骤级看 `Deploy to server over SSH` 是 success 还是 skipped。
- `deploy.yml` —— GitHub Pages 兜底，与上者并行独立。
- 服务器侧细节与站群对照表见 `deploy/sites.yml`（文档性质，不被工作流解析）。
