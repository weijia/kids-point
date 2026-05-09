import { ref } from 'vue'

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

const loadAchievements = () => {
  const savedAchievements = localStorage.getItem('kidpoints-achievements')
  if (savedAchievements) {
    achievements.value = JSON.parse(savedAchievements)
  }
}

const saveAchievements = () => {
  localStorage.setItem('kidpoints-achievements', JSON.stringify(achievements.value))
}

export function useAchievements() {
  const addAchievement = (data: Omit<Achievement, 'id' | 'createdAt'>) => {
    const newAchievement: Achievement = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    }
    achievements.value.push(newAchievement)
    saveAchievements()
    return newAchievement
  }

  const updateAchievement = (id: string, data: Partial<Achievement>) => {
    const index = achievements.value.findIndex(a => a.id === id)
    if (index !== -1) {
      achievements.value[index] = { ...achievements.value[index], ...data }
      saveAchievements()
    }
  }

  const deleteAchievement = (id: string) => {
    achievements.value = achievements.value.filter(a => a.id !== id)
    saveAchievements()
  }

  return {
    achievements,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    loadAchievements
  }
}
