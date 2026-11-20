import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import Particles from 'vue3-particles'
import App from './App.vue'
import './style.css'
import './styles/main.css'
import { i18n } from './i18n'
import { routes } from './router'
import databaseService from './services/database'
import { useSettings } from './stores/settings'
import { useMembers } from './stores/members'
import { useTasks } from './stores/tasks'
import { useRewards } from './stores/rewards'
import { useAchievements } from './stores/achievements'
import { useViolations } from './stores/violations'

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

async function bootstrap() {
  // PouchDB 是业务数据主存储，确保所有 store 读取前已初始化
  await databaseService.initialize('kidspoints')
  
  await Promise.all([
    useSettings().ensureLoaded(),
    useMembers().ensureLoaded(),
    useTasks().ensureLoaded(),
    useRewards().ensureLoaded(),
    useAchievements().ensureLoaded(),
    useViolations().ensureLoaded(),
  ])

  const app = createApp(App)
  app.use(router)
  app.use(i18n)
  app.use(Particles)
  app.mount('#app')
}

bootstrap()
