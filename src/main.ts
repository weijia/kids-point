import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import Particles from 'vue3-particles'
import App from './App.vue'
import './style.css'
import './styles/main.css'
import { i18n } from './i18n'

import { routes } from './router'
import { useMembers } from './stores/members'
import { useTasks } from './stores/tasks'
import { useSettings } from './stores/settings'
import { useRewards } from './stores/rewards'
import { useAchievements } from './stores/achievements'

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const membersStore = useMembers()
const tasksStore = useTasks()
const settingsStore = useSettings()
const rewardsStore = useRewards()
const achievementsStore = useAchievements()

membersStore.loadMembers()
tasksStore.loadTasks()
rewardsStore.loadRewards()
achievementsStore.loadAchievements()

const app = createApp(App)

app.provide('membersStore', membersStore)
app.provide('tasksStore', tasksStore)
app.provide('settingsStore', settingsStore)
app.provide('rewardsStore', rewardsStore)
app.provide('achievementsStore', achievementsStore)

app.use(router)
app.use(i18n)
app.use(Particles)
app.mount('#app')
