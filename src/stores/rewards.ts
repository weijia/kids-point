import { ref, watch } from 'vue'
import { initConfig, getConfigRepo } from '../services/config'

export interface Reward {
  id: string
  title: string
  description: string
  icon: string
  points: number
  createdAt: number
}

const rewards = ref<Reward[]>([])
let initialized = false

const loadRewards = async () => {
  const repo = await initConfig()
  try {
    const saved = repo.getConfig<Reward[]>('/rewards')
    if (saved && Array.isArray(saved)) {
      rewards.value = saved
    }
  } catch (e) {
    console.warn('Failed to load rewards from config:', e)
    const savedRewards = localStorage.getItem('kidpoints-rewards')
    if (savedRewards) {
      rewards.value = JSON.parse(savedRewards)
    }
  }
  initialized = true
}

const saveRewards = () => {
  if (!initialized) return
  try {
    const repo = getConfigRepo()
    repo.setConfig('/rewards', rewards.value)
  } catch (e) {
    console.warn('Failed to save rewards to config, falling back to localStorage:', e)
    localStorage.setItem('kidpoints-rewards', JSON.stringify(rewards.value))
  }
}

watch(rewards, () => {
  saveRewards()
}, { deep: true })

let loadPromise: Promise<void> | null = null

const ensureLoaded = (): Promise<void> => {
  if (initialized) return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = loadRewards()
  return loadPromise
}

export function useRewards() {
  const addReward = (data: Omit<Reward, 'id' | 'createdAt'>) => {
    const newReward: Reward = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    }
    rewards.value.push(newReward)
    return newReward
  }

  const updateReward = (id: string, data: Partial<Reward>) => {
    const index = rewards.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rewards.value[index] = { ...rewards.value[index], ...data }
    }
  }

  const deleteReward = (id: string) => {
    rewards.value = rewards.value.filter(r => r.id !== id)
  }

  return {
    rewards,
    addReward,
    updateReward,
    deleteReward,
    loadRewards: ensureLoaded,
    ensureLoaded
  }
}
