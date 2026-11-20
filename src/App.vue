<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Navbar from './components/layout/Navbar.vue'
import Footer from './components/layout/Footer.vue'
import UpdateToast from './components/pwa/UpdateToast.vue'
import { useMembers } from './stores/members'
import { useTasks } from './stores/tasks'
import { useRewards } from './stores/rewards'
import { useAchievements } from './stores/achievements'
import { useSettings } from './stores/settings'
import { databaseService, type SyncStatus } from './services/database'

const router = useRouter()
const { t, locale } = useI18n()

const membersStore = useMembers()
const tasksStore = useTasks()
const rewardsStore = useRewards()
const achievementsStore = useAchievements()
const settingsStore = useSettings()

const syncStatus = ref<SyncStatus>('idle')
const syncError = ref<string | null>(null)

provide('membersStore', membersStore)
provide('tasksStore', tasksStore)
provide('rewardsStore', rewardsStore)
provide('achievementsStore', achievementsStore)
provide('settingsStore', settingsStore)

// 数据组连上且正在同步/同步完成/出错时显示状态提示
const showSyncStatus = computed(() => syncStatus.value !== 'idle')

const syncStatusText = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return t('sync.syncing')
    case 'synced': return t('sync.synced')
    case 'error': return t('sync.error')
    default: return ''
  }
})

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

onMounted(async () => {
  locale.value = settingsStore.settings.locale

  membersStore.loadMembers()
  tasksStore.loadTasks()
  rewardsStore.loadRewards()
  achievementsStore.loadAchievements()

  databaseService.onStatusChange((status) => {
    syncStatus.value = status
    if (status === 'error') {
      syncError.value = t('sync.failed')
    } else {
      syncError.value = null
    }
  })

  checkAndResetTasks()

  const now = new Date()
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
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
      <div v-if="showSyncStatus" class="sync-indicator" :class="'sync-' + syncStatus">
        <span v-if="syncStatus === 'syncing'" class="sync-spinner"></span>
        <span v-if="syncStatus === 'synced'" class="sync-icon">✓</span>
        <span v-if="syncStatus === 'error'" class="sync-icon">✗</span>
        <span>{{ syncStatusText }}</span>
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
    <UpdateToast />
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
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease;
}

.sync-syncing {
  background-color: var(--primary, #4CAF50);
  color: white;
}

.sync-synced {
  background-color: #d4edda;
  color: #155724;
}

.sync-error {
  background-color: #f8d7da;
  color: #721c24;
}

.sync-indicator.sync-error {
  background-color: #f8d7da;
  color: #721c24;
}

.sync-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.sync-icon {
  font-size: 16px;
  font-weight: bold;
}

.sync-synced .sync-icon {
  color: #155724;
}

.sync-error .sync-icon {
  color: #721c24;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
