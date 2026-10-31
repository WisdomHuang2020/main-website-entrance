# Know-How&Tools&Skills · 站群入口门户

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

`web-training` 是全站唯一的**二级子域**，**实际服务域名带 `www.` 前缀**
（`www.web-training.power-knowledge.tech`），证书因此单独签发；
表格里为与其他 5 行格式一致省去了 `www.`，裸名访问会 **301 跳到带 www 的地址**
（2026-10-31 实测：裸名 301 → www，跟随 1 跳后 200）。
域名在 1440px 下会被卡片 `truncate` 截尾，故在 `SiteCard.tsx` 里用 `title` 属性兜住完整地址。

各站点的计算口径与免责声明以对应站内的说明为准；本站只做导航。

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

## 部署链路

- `deploy-lighthouse.yml` —— 正式域名。需要仓库 secrets：`LH_HOST` / `LH_USER` / `LH_ROOT`
  （`/var/www/entrance`）/ `LH_SSH_KEY` / 可选 `LH_PORT`。未配置时**优雅跳过**（job 仍显绿，
  属假绿），因此判断是否真的部署了必须下钻到步骤级看 `Deploy to server over SSH` 是 success 还是 skipped。
- `deploy.yml` —— GitHub Pages 兜底，与上者并行独立。
- 服务器侧细节与站群对照表见 `deploy/sites.yml`（文档性质，不被工作流解析）。
