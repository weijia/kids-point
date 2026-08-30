/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vue3-particles' {
  import { Plugin } from 'vue'
  const Particles: Plugin
  export default Particles
}

// vite.config.ts 的 define 在构建时注入的全局常量（JSON.stringified 字面量）
// version.ts 中读取它们；dev 模式下用 typeof !== 'undefined' 降级保护
declare const __APP_VERSION__: string
declare const __APP_BUILD_TIME__: string
declare const __APP_COMMIT_SHA__: string

interface ImportMetaEnv {
  readonly VITE_BASE_URL: string
  // 版本/构建信息的来源已经改成 define 注入（见上方全局常量），
  // 下面这三个仅用于保留旧引用但不会被填充：
  readonly VITE_APP_VERSION?: string
  readonly VITE_APP_BUILD_TIME?: string
  readonly VITE_APP_COMMIT_SHA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
