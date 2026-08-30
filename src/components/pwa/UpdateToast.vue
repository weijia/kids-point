<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatVersionFull } from '../../version'

const { t } = useI18n()
const show = ref(false)
// 当前新版本将安装的版本信息（从 formatVersionFull() 拿到）
const newVersionLabel = ref('')

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
          newVersionLabel.value = formatVersionFull()
          console.log('[PWA] 新版本可用:', newVersionLabel.value)
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
        <div class="toast-text-wrap">
          <div class="toast-title">
            🎉 {{ t('update.newVersionAvailable') }}
          </div>
          <div v-if="newVersionLabel" class="toast-version">
            {{ newVersionLabel }}
          </div>
        </div>
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
  gap: 16px;
  background-color: rgba(33, 33, 33, 0.95);
  color: #fff;
  padding: 12px 18px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  max-width: 92vw;
}

.toast-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toast-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.toast-version {
  font-size: 12px;
  opacity: 0.85;
  font-family: 'SFMono-Regular', Consolas, monospace;
  line-height: 1.3;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
  white-space: nowrap;
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
    flex-wrap: wrap;
  }
}
</style>
