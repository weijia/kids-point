import { ref, watch } from 'vue'
import { initConfig, getConfigRepo } from '../services/config'

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
  const repo = await initConfig()
  try {
    const saved = repo.getConfig<Achievement[]>('/achievements')
    if (saved && Array.isArray(saved)) {
      achievements.value = saved
    }
  } catch (e) {
    console.warn('Failed to load achievements from config:', e)
    const savedAchievements = localStorage.getItem('kidpoints-achievements')
    if (savedAchievements) {
      achievements.value = JSON.parse(savedAchievements)
    }
  }
  initialized = true
}

const saveAchievements = () => {
  if (!initialized) return
  try {
    const repo = getConfigRepo()
    repo.setConfig('/achievements', achievements.value)
  } catch (e) {
    console.warn('Failed to save achievements to config, falling back to localStorage:', e)
    localStorage.setItem('kidpoints-achievements', JSON.stringify(achievements.value))
  }
}

watch(achievements, () => {
  saveAchievements()
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
    if (index !== -1) {
      achievements.value[index] = { ...achievements.value[index], ...data }
    }
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
