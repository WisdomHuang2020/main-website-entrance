import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

export default defineConfig({
  // 相对路径（base: './'）：同一份 dist 必须同时能在
  //   ① 自有域名根路径  https://power-knowledge.tech/
  //   ② GitHub Pages 子路径 https://wisdomhuang2020.github.io/main-website-entrance/
  // 下正确解析资源。改成 '/' 会让 Pages 通道整站白屏。
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // 版本号唯一来源 = package.json 的 version。
    // 页头徽标与页脚各渲染一次同一个常量，禁止任何地方硬编码 vX.Y.Z
    // （由 scripts/verify-version.mjs 断言）。
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
