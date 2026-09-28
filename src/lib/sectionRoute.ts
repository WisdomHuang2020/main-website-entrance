import { useEffect, type MouseEvent } from 'react'

/**
 * 区块的「干净 URL」导航。
 *
 * 用户要求去掉 URL 里的 `#`：`/#tools` → `/tools`、`/#principles` → `/engineers`。
 * 由 hash 改成真实路径后，有**两种进入方式**都必须处理：
 *
 *   ① 站内点击导航 —— pushState 换 URL + 平滑滚动，不重新加载页面；
 *   ② 直接打开或刷新 /tools、/engineers —— 服务端（自有域名走 nginx 的
 *      `try_files $uri $uri/ /index.html`，Pages 通道走仓库根的 404.html，
 *      见 scripts/copy-404.mjs）返回的仍是同一份 index.html，
 *      由前端读 location.pathname 决定开局滚到哪一段。
 *      ⚠️ 少了 ① 之外的 ② 这两条兜底，深链会白屏 —— 这是本改动最容易漏的配套。
 *
 * 路径一律用**相对形式**（`./tools`）：同一份构建产物要同时服务
 *   根路径部署      https://power-knowledge.tech/tools
 *   Pages 子路径部署 https://wisdomhuang2020.github.io/main-website-entrance/tools
 * 用绝对路径 `/tools` 会让 Pages 通道 404。
 */

export interface SectionLink {
  /** 相对路径，用于 <a href> 与 pushState */
  path: string
  /** 目标区块的 DOM id */
  id: string
  label: string
}

export const SECTION_LINKS: SectionLink[] = [
  { path: './tools', id: 'tools', label: '工具集' },
  { path: './engineers', id: 'principles', label: '工程口径' },
]

/** 从当前地址解析目标区块 id。只取路径**最后一段**，以兼容 Pages 子路径。 */
export function sectionIdFromLocation(): string | null {
  const segs = window.location.pathname.split('/').filter(Boolean)
  const last = segs.length ? segs[segs.length - 1] : ''
  const byPath = SECTION_LINKS.find((s) => s.path.replace('./', '') === last)
  if (byPath) return byPath.id
  // 兼容改造前的 #tools / #principles 旧链接
  const hash = window.location.hash.replace(/^#/, '')
  return hash || null
}

/**
 * 滚动到指定区块。
 *
 * 用 scrollIntoView 而非 window.scrollTo —— 前者会**自动遵守区块上的
 * `scroll-mt-24`**（给吸顶页头让位），后者不会，得手工减偏移量。
 *
 * ⚠️ 实测坑（2026-09-28）：`behavior: 'auto'` **不是"瞬时"**——
 * 按 CSSOM View 规范，'auto' 表示"由 `scroll-behavior` 属性决定"，而本站
 * html 上设了 `scroll-behavior: smooth`，于是深链进页面会先自己平滑滚一段，
 * 观感很怪，而且看不到首屏。**要瞬时必须显式写 `'instant'`。**
 */
export function scrollToSection(id: string, smooth: boolean): void {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' })
}

/** 点击导航项：换成干净 URL 并滚动，不触发整页加载。 */
export function onSectionClick(e: MouseEvent<HTMLAnchorElement>, id: string): void {
  // 保留修饰键 / 中键 / 已 preventDefault 的原生行为 —— 用户想在新标签页打开就该让它打开
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const href = e.currentTarget.getAttribute('href')
  if (!href) return
  e.preventDefault()
  window.history.pushState(null, '', href)
  scrollToSection(id, true)
}

/** 返回首页顶部（品牌标记点击）。 */
export function onHomeClick(e: MouseEvent<HTMLAnchorElement>): void {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const href = e.currentTarget.getAttribute('href')
  if (!href) return
  e.preventDefault()
  window.history.pushState(null, '', href)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * 在 App 里调用一次，处理两种"非点击"进入：
 *   ① 开局：直接打开 /tools、/engineers 这类深链 → 瞬时定位（不用平滑动画，
 *      否则一进页面就自己滚一段，观感很怪）；
 *   ② 前进/后退：popstate 时按当前 URL 重新定位（并用平滑，符合"返回上一处"的直觉）。
 *
 * ⚠️ 实测坑（2026-09-28）：**开局定位必须在字体到位后再校一次**。
 *   首帧用的是系统回退字体，Inter 到手后文本换行会变、其下所有内容整体位移，
 *   原先算好的滚动位置就偏了 —— 实测 /tools 偏 10px、`/engineers` 偏 349px。
 *   所以监听 document.fonts.ready 再对一次；但对之前先确认页面没被别人动过
 *   （滚过或切过路由就别硬拉回去，那会跟用户抢控制权）。
 */
export function useSectionRoute(): void {
  useEffect(() => {
    const initial = sectionIdFromLocation()
    let timer = 0

    if (initial) {
      scrollToSection(initial, false)
      // 基准是"我们最近一次把页面放到的位置"，而不是"首次定位的位置"。
      // ⚠️ 用后者会**自我锁死**：第一次重定位会合法地移动页面，随后所有重定位
      //    都会被误判成"用户自己滚过"而放弃（实测就卡在 10px 残差上）。
      let lastApplied = window.scrollY
      const refix = () => {
        if (sectionIdFromLocation() !== initial) return
        // 只有页面还在我们放的位置上才继续校，别跟用户抢控制权
        if (Math.abs(window.scrollY - lastApplied) > 2) return
        scrollToSection(initial, false)
        lastApplied = window.scrollY
      }
      // 字体就绪 → 下一帧再校一次。
      // 两次都要：fonts.ready 只保证"加载完成"，字体的实际替换与回流可能还在后一帧，
      // 只校一次会留下个位数像素残差（实测 /tools 差 10px）。
      if (document.fonts && typeof document.fonts.ready?.then === 'function') {
        document.fonts.ready.then(
          () => {
            refix()
            requestAnimationFrame(refix)
          },
          () => {},
        )
      }
      // 兜底再校一次，覆盖字体切换之后的二次回流（运行时的版本号请求等也会触发一次重渲染）
      timer = window.setTimeout(refix, 400)
    }

    const onPop = () => {
      const id = sectionIdFromLocation()
      if (id) scrollToSection(id, true)
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (timer) window.clearTimeout(timer)
    }
  }, [])
}
