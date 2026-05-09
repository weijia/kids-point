<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from './components/layout/Navbar.vue'
import Footer from './components/layout/Footer.vue'
import { useMembers } from './stores/members'
import { useTasks } from './stores/tasks'
import { useRewards } from './stores/rewards'
import { useAchievements } from './stores/achievements'
import { useSettings } from './stores/settings'
import { databaseService } from './services/database'

const router = useRouter()

const membersStore = useMembers()
const tasksStore = useTasks()
const rewardsStore = useRewards()
const achievementsStore = useAchievements()
const settingsStore = useSettings()

const isSyncing = ref(false)
const syncError = ref<string | null>(null)

provide('membersStore', membersStore)
provide('tasksStore', tasksStore)
provide('rewardsStore', rewardsStore)
provide('achievementsStore', achievementsStore)
provide('settingsStore', settingsStore)

router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth && !settingsStore.isAuthenticated) {
    next({ name: 'AdminLogin' })
  } else {
    next()
  }
})

const checkAndResetTasks = () => {
  const now = new Date()
  const lastReset = settingsStore.settings.lastDailyReset ? new Date(settingsStore.settings.lastDailyReset) : null
  
  if (!lastReset || now.getDate() !== lastReset.getDate()) {
    tasksStore.resetDailyTasks()
    settingsStore.updateSettings({ lastDailyReset: now.getTime() })
  }
  
  if (!lastReset || (now.getDay() === 1 && now.getDate() !== lastReset.getDate())) {
    tasksStore.resetWeeklyTasks()
  }
}

let resetTimer: number

const initializeDatabase = async () => {
  try {
    await databaseService.initialize('kidspoints')
    
    const webdavConfig = settingsStore.settings.webdavSync
    if (webdavConfig && webdavConfig.enabled) {
      await databaseService.configureWebDAV({
        url: webdavConfig.url,
        username: webdavConfig.username,
        password: webdavConfig.password
      })
      
      databaseService.onStatusChange((status) => {
        if (status === 'syncing') {
          isSyncing.value = true
          syncError.value = null
        } else if (status === 'synced') {
          isSyncing.value = false
        } else if (status === 'error') {
          isSyncing.value = false
          syncError.value = 'Sync failed. Please try again.'
        }
      })
    }
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
}

const performAutoLoad = async () => {
  const webdavConfig = settingsStore.settings.webdavSync
  if (webdavConfig && webdavConfig.enabled && !isSyncing.value) {
    try {
      isSyncing.value = true
      await databaseService.loadFromWebDAV()
      syncError.value = null
    } catch (error) {
      console.error('Auto-load failed:', error)
    } finally {
      isSyncing.value = false
    }
  }
}

onMounted(async () => {
  membersStore.loadMembers()
  tasksStore.loadTasks()
  rewardsStore.loadRewards()
  achievementsStore.loadAchievements()
  settingsStore.loadSettings()
  
  await initializeDatabase()
  
  if (settingsStore.settings.webdavSync?.enabled) {
    await performAutoLoad()
  }
  
  checkAndResetTasks()
  
  const now = new Date()
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0
  )
  const timeUntilMidnight = midnight.getTime() - now.getTime()
  
  resetTimer = setTimeout(() => {
    checkAndResetTasks()
    setInterval(checkAndResetTasks, 24 * 60 * 60 * 1000)
  }, timeUntilMidnight) as unknown as number
})

onUnmounted(() => {
  clearTimeout(resetTimer)
})
</script>

<template>
  <div class="app-container">
    <Navbar />
    <main class="main-content">
      <div v-if="isSyncing" class="sync-indicator">
        <span class="sync-spinner"></span>
        <span>Syncing...</span>
      </div>
      <div v-if="syncError" class="sync-error">
        {{ syncError }}
      </div>
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <Footer />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.main-content {
  flex: 1;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.sync-indicator {
  position: fixed;
  top: 70px;
  right: 20px;
  background-color: var(--primary, #4CAF50);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.sync-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sync-error {
  position: fixed;
  top: 70px;
  right: 20px;
  background-color: #f44336;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  max-width: 300px;
}
</style>
