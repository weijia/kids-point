import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',           // prompt 模式，不自动更新
      injectRegister: 'auto',           // 自动注入 SW 注册代码
      strategies: 'injectManifest',     // 使用自定义 SW
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        injectionPoint: undefined,      // 禁用默认注入点，手动控制
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      manifest: {
        name: 'KidPoints',
        short_name: 'KidPoints',
        description: 'Children reward and task management system',
        theme_color: '#FFD700',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  base: './', // 使用相对路径，允许在任何目录下部署
  define: {
    '__APP_BUILD_TIME__': JSON.stringify(new Date().toISOString()),
  },
})
