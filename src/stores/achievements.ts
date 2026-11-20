import { ref, watch } from 'vue'
import { loadDoc, saveDoc } from '../services/doc-store'

export type AchievementRequirementType = 'taskCount' | 'pointsTotal' | 'rewardsRedeemed' | 'custom'

export interface AchievementRequirement {
  type: AchievementRequirementType
  count: number
  taskType?: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  requirement: AchievementRequirement
  createdAt: number
}

const achievements = ref<Achievement[]>([])
let initialized = false

const loadAchievements = async () => {
  try {
    const saved = await loadDoc<Achievement[]>('achievements')
    if (saved && Array.isArray(saved)) achievements.value = saved
  } catch (e) {
    console.warn('Failed to load achievements from PouchDB:', e)
  }
  initialized = true
}

watch(achievements, () => {
  if (initialized) void saveDoc('achievements', achievements.value)
}, { deep: true })

let loadPromise: Promise<void> | null = null

const ensureLoaded = (): Promise<void> => {
  if (initialized) return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = loadAchievements()
  return loadPromise
}

export function useAchievements() {
  const addAchievement = (data: Omit<Achievement, 'id' | 'createdAt'>) => {
    const newAchievement: Achievement = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    }
    achievements.value.push(newAchievement)
    return newAchievement
  }

  const updateAchievement = (id: string, data: Partial<Achievement>) => {
    const index = achievements.value.findIndex(a => a.id === id)
    if (index !== -1) achievements.value[index] = { ...achievements.value[index], ...data }
  }

  const deleteAchievement = (id: string) => {
    achievements.value = achievements.value.filter(a => a.id !== id)
  }

  return {
    achievements,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    loadAchievements: ensureLoaded,
    ensureLoaded
  }
}
