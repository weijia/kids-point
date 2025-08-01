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
