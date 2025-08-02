import { ref } from 'vue'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  requirement: {
    type: 'taskCount' | 'pointsTotal' | 'rewardsRedeemed' | 'custom'
    count: number
    taskType?: string
  }
  createdAt: number
  earnedBy: AchievementRecord[]
}

export interface AchievementRecord {
  memberId: string
  date: number
}

export interface AchievementsStore {
  achievements: Achievement[]
  addAchievement: (achievement: Omit<Achievement, 'id' | 'createdAt' | 'earnedBy'>) => void
  updateAchievement: (id: string, data: Partial<Achievement>) => void
  deleteAchievement: (id: string) => void
  getAchievementById: (id: string) => Achievement | undefined
  awardAchievement: (achievementId: string, memberId: string) => void
  checkAchievements: (memberId: string) => void
  getMemberAchievements: (memberId: string) => { achievement: Achievement, date: number }[]
  loadAchievements: () => void
  saveAchievements: () => void
}

/**
 * 成就存储钩子函数
 * 
 * 提供成就系统的状态管理及相关操作方法，包括：
 * - 从localStorage加载/保存成就数据
 * - 初始化默认成就
 * - 成就的增删改查
 * - 成员成就的授予与查询
 * 
 * @returns {AchievementsStore} 返回成就存储对象，包含成就列表和操作方法
 */
export function useAchievements(): AchievementsStore {
  const achievements = ref<Achievement[]>([])

  // Load achievements from localStorage
  const loadAchievements = () => {
    const savedAchievements = localStorage.getItem('kidpoints-achievements')
    if (savedAchievements) {
      achievements.value = JSON.parse(savedAchievements)
    } else {
      // Add some default achievements if none exist
      initializeDefaultAchievements()
    }
  }

  // Initialize with default achievements
  const initializeDefaultAchievements = () => {
    const defaultAchievements: Omit<Achievement, 'id' | 'createdAt' | 'earnedBy'>[] = [
      {
        title: 'First Steps',
        description: 'Complete your first task',
        icon: '🏁',
        requirement: {
          type: 'taskCount',
          count: 1
        }
      },
      {
        title: 'Diligent Worker',
        description: 'Complete 10 tasks',
        icon: '🔨',
        requirement: {
          type: 'taskCount',
          count: 10
        }
      },
      {
        title: 'Point Collector',
        description: 'Earn 100 points total',
        icon: '💯',
        requirement: {
          type: 'pointsTotal',
          count: 100
        }
      },
      {
        title: 'Big Spender',
        description: 'Redeem 3 rewards',
        icon: '🛍️',
        requirement: {
          type: 'rewardsRedeemed',
          count: 3
        }
      }
    ]
    
    defaultAchievements.forEach(achievement => {
      addAchievement(achievement)
    })
  }

  // Save achievements to localStorage
  const saveAchievements = () => {
    localStorage.setItem('kidpoints-achievements', JSON.stringify(achievements.value))
  }

  // Add a new achievement
  const addAchievement = (achievement: Omit<Achievement, 'id' | 'createdAt' | 'earnedBy'>) => {
    const newAchievement: Achievement = {
      id: Date.now().toString(),
      ...achievement,
      createdAt: Date.now(),
      earnedBy: []
    }
    
    achievements.value.push(newAchievement)
    saveAchievements()
  }

  // Update an existing achievement
  const updateAchievement = (id: string, data: Partial<Achievement>) => {
    const index = achievements.value.findIndex(achievement => achievement.id === id)
    if (index !== -1) {
      achievements.value[index] = { ...achievements.value[index], ...data }
      saveAchievements()
    }
  }

  // Delete an achievement
  const deleteAchievement = (id: string) => {
    achievements.value = achievements.value.filter(achievement => achievement.id !== id)
    saveAchievements()
  }

  // Get an achievement by ID
  const getAchievementById = (id: string): Achievement | undefined => {
    return achievements.value.find(achievement => achievement.id === id)
  }

  // Award an achievement to a member
  const awardAchievement = (achievementId: string, memberId: string) => {
    const achievement = getAchievementById(achievementId)
    if (achievement) {
      // Check if the member already has this achievement
      const hasAchievement = achievement.earnedBy.some(record => record.memberId === memberId)
      
      if (!hasAchievement) {
        achievement.earnedBy.push({
          memberId,
          date: Date.now()
        })
        
        saveAchievements()
      }
    }
  }

  // Check if a member has earned any new achievements
  const checkAchievements = (_memberId: string) => {
    // This would be implemented to check the member's stats against achievements
    // and award any that they qualify for
    // It needs to be called when relevant events occur (tasks completed, points earned, etc.)
  }

  // Get all achievements earned by a specific member
  const getMemberAchievements = (memberId: string): { achievement: Achievement, date: number }[] => {
    const memberAchievements: { achievement: Achievement, date: number }[] = []
    
    achievements.value.forEach(achievement => {
      achievement.earnedBy.forEach(record => {
        if (record.memberId === memberId) {
          memberAchievements.push({
            achievement,
            date: record.date
          })
        }
      })
    })
    
    // Sort by date (newest first)
    return memberAchievements.sort((a, b) => b.date - a.date)
  }

  return {
    achievements: achievements.value,
    addAchievement,
    updateAchievement,
    deleteAchievement,
    getAchievementById,
    awardAchievement,
    checkAchievements,
    getMemberAchievements,
    loadAchievements,
    saveAchievements
  }
}