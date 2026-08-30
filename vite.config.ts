import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import childProcess from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 读取 package.json 中的版本号
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
)
const APP_VERSION = pkg.version || '0.0.0'
const APP_BUILD_TIME = new Date().toISOString()

// 读取 git commit sha（如果可用，失败则空字符串）
let APP_COMMIT_SHA = ''
try {
  APP_COMMIT_SHA = childProcess
    .execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
} catch {
  /* ignore: not a git repo */
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',           // prompt 模式，不自动更新（由 UpdateToast.vue 引导用户手动刷新）
      injectRegister: 'auto',           // 自动注入 SW 注册代码
      strategies: 'injectManifest',     // 使用自定义 SW
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
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
    '__APP_VERSION__': JSON.stringify(APP_VERSION),
    '__APP_BUILD_TIME__': JSON.stringify(APP_BUILD_TIME),
    '__APP_COMMIT_SHA__': JSON.stringify(APP_COMMIT_SHA),
  },
  build: {
    chunkSizeWarningLimit: 1500, // 当前 PWA + 同步后端总打包 1.26MB，略放宽警告阈值
  },
})
