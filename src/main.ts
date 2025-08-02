import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import Particles from 'vue3-particles'
import App from './App.vue'
import './style.css'
import './styles/main.css'

// Import routes and stores
import { routes } from './router'
import { useMembers } from './stores/members'
import { useTasks } from './stores/tasks'
import { useSettings } from './stores/settings'
import { useRewards } from './stores/rewards'
import { useAchievements } from './stores/achievements'

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Create stores
const membersStore = useMembers()
const tasksStore = useTasks()
const settingsStore = useSettings()
const rewardsStore = useRewards()
const achievementsStore = useAchievements()

// Load data from localStorage
membersStore.loadMembers()
tasksStore.loadTasks()
rewardsStore.loadRewards()
achievementsStore.loadAchievements()

// Create and mount app
const app = createApp(App)

// Provide stores to the app
app.provide('membersStore', membersStore)
app.provide('tasksStore', tasksStore)
app.provide('settingsStore', settingsStore)
app.provide('rewardsStore', rewardsStore)
app.provide('achievementsStore', achievementsStore)

app.use(router)
app.use(Particles)
app.mount('#app')