import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import Particles from 'vue3-particles'
import App from './App.vue'
import './style.css'
import './styles/main.css'
import { i18n } from './i18n'
import { routes } from './router'
import { initConfig } from './services/config'
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
  await initConfig()
  
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
