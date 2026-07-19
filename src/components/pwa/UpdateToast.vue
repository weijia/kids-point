<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const show = ref(false)

let updateAvailable = false
let updateInterval: number | null = null
let controllerChangeHandler: (() => void) | null = null

const handleUpdate = (reg: ServiceWorkerRegistration) => {
  reg.addEventListener('updatefound', () => {
    const newWorker = reg.installing
    if (!newWorker) return
    newWorker.addEventListener('statechange', () => {
      // 新 Worker 已安装且等待中，只通知一次
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        if (!updateAvailable) {
          updateAvailable = true
          console.log('[PWA] 新版本可用')
          show.value = true
        }
      }
    })
  })
}

const handleRefresh = async () => {
  try {
    const reg = await navigator.serviceWorker.ready
    const newWorker = reg.waiting
    if (newWorker) {
      // 发送消息让新 SW 跳过等待
      newWorker.postMessage({ type: 'SKIP_WAITING' })
      // 新 SW 激活后刷新页面
      controllerChangeHandler = () => {
        window.location.reload()
      }
      navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler)
    }
    show.value = false
  } catch (e) {
    console.error('[PWA] 刷新失败:', e)
    // 失败时直接刷新页面
    window.location.reload()
  }
}

onMounted(() => {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.ready.then((reg) => {
    handleUpdate(reg)
    // 3 秒后检查更新
    setTimeout(() => reg.update().catch(console.error), 3000)
  })

  // 每 5 分钟轮询
  updateInterval = window.setInterval(() => {
    navigator.serviceWorker.ready
      .then((reg) => reg.update().catch(console.error))
      .catch(console.error)
  }, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (updateInterval !== null) {
    clearInterval(updateInterval)
  }
  if (controllerChangeHandler) {
    navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
  }
})
</script>

<template>
  <Transition name="toast-slide">
    <div v-if="show" class="update-toast-wrapper">
      <div class="update-toast">
        <span class="toast-text">{{ t('update.newVersionAvailable') }}</span>
        <button class="refresh-btn" @click="handleRefresh">
          <svg class="refresh-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 11-3-6.7L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
          {{ t('update.refresh') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.update-toast-wrapper {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.update-toast {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: rgba(33, 33, 33, 0.95);
  color: #fff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  max-width: 90vw;
}

.toast-text {
  font-size: 14px;
  font-weight: 500;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.refresh-btn:hover {
  background-color: rgba(255, 255, 255, 0.25);
}

.refresh-icon {
  width: 14px;
  height: 14px;
}

/* 进入动画 */
.toast-slide-enter-active {
  transition: all 0.3s ease;
}

.toast-slide-leave-active {
  transition: all 0.3s ease;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}

@media (max-width: 480px) {
  .update-toast-wrapper {
    bottom: 16px;
    width: 100%;
    padding: 0 12px;
  }

  .update-toast {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
