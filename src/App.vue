<script setup lang="ts">
import { onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from './components/layout/Navbar.vue'
import Footer from './components/layout/Footer.vue'
import { useMembers } from './stores/members'
import { useTasks } from './stores/tasks'
import { useRewards } from './stores/rewards'
import { useAchievements } from './stores/achievements'
import { useSettings } from './stores/settings'

// Initialize router
const router = useRouter()

// Initialize stores
const membersStore = useMembers()
const tasksStore = useTasks()
const rewardsStore = useRewards()
const achievementsStore = useAchievements()
const settingsStore = useSettings()

// Provide stores to all components
provide('membersStore', membersStore)
provide('tasksStore', tasksStore)
provide('rewardsStore', rewardsStore)
provide('achievementsStore', achievementsStore)
provide('settingsStore', settingsStore)

// Router guard for admin routes
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !settingsStore.isAuthenticated) {
    next({ name: 'AdminLogin' })
  } else {
    next()
  }
})

// Load data from localStorage on mount
onMounted(() => {
  membersStore.loadMembers()
  tasksStore.loadTasks()
  rewardsStore.loadRewards()
  achievementsStore.loadAchievements()
  settingsStore.loadSettings()
})
</script>

<template>
  <div class="app-container">
    <Navbar />
    <main class="main-content">
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
</style>