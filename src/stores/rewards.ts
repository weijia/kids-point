import { ref, watch } from 'vue'
import { loadDoc, saveDoc } from '../services/doc-store'

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
  try {
    const saved = await loadDoc<Reward[]>('rewards')
    if (saved && Array.isArray(saved)) rewards.value = saved
  } catch (e) {
    console.warn('Failed to load rewards from PouchDB:', e)
  }
  initialized = true
}

watch(rewards, () => {
  if (initialized) void saveDoc('rewards', rewards.value)
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
    if (index !== -1) rewards.value[index] = { ...rewards.value[index], ...data }
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
