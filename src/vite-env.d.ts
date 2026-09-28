/// <reference types="vite/client" />

/**
 * 由 vite.config.ts 的 `define` 从 package.json 的 version 注入。
 * 这是本站版本号的唯一运行时来源 —— 任何地方都不得硬编码 vX.Y.Z。
 */
declare const __APP_VERSION__: string
