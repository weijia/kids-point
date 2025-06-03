import { ref } from 'vue'

export interface Reward {
  id: string
  title: string
  description: string
  icon: string
  points: number
  createdAt: number
  isAvailable: boolean
  redeemedBy: RedemptionRecord[]
}

export interface RedemptionRecord {
  memberId: string
  date: number
}

export interface RewardsStore {
  rewards: Reward[]
  addReward: (reward: Omit<Reward, 'id' | 'createdAt' | 'isAvailable' | 'redeemedBy'>) => void
  updateReward: (id: string, data: Partial<Reward>) => void
  deleteReward: (id: string) => void
  getRewardById: (id: string) => Reward | undefined
  redeemReward: (rewardId: string, memberId: string) => boolean
  getRedemptionsByMember: (memberId: string) => { reward: Reward, date: number }[]
  loadRewards: () => void
  saveRewards: () => void
}

export function useRewards(): RewardsStore {
  const rewards = ref<Reward[]>([])

  // Load rewards from localStorage
  const loadRewards = () => {
    const savedRewards = localStorage.getItem('kidpoints-rewards')
    if (savedRewards) {
      rewards.value = JSON.parse(savedRewards)
    }
  }

  // Save rewards to localStorage
  const saveRewards = () => {
    localStorage.setItem('kidpoints-rewards', JSON.stringify(rewards.value))
  }

  // Add a new reward
  const addReward = (reward: Omit<Reward, 'id' | 'createdAt' | 'isAvailable' | 'redeemedBy'>) => {
    const newReward: Reward = {
      id: Date.now().toString(),
      ...reward,
      createdAt: Date.now(),
      isAvailable: true,
      redeemedBy: []
    }
    
    rewards.value.push(newReward)
    saveRewards()
  }

  // Update an existing reward
  const updateReward = (id: string, data: Partial<Reward>) => {
    const index = rewards.value.findIndex(reward => reward.id === id)
    if (index !== -1) {
      rewards.value[index] = { ...rewards.value[index], ...data }
      saveRewards()
    }
  }

  // Delete a reward
  const deleteReward = (id: string) => {
    rewards.value = rewards.value.filter(reward => reward.id !== id)
    saveRewards()
  }

  // Get a reward by ID
  const getRewardById = (id: string): Reward | undefined => {
    return rewards.value.find(reward => reward.id === id)
  }

  // Redeem a reward
  const redeemReward = (rewardId: string, memberId: string): boolean => {
    const reward = getRewardById(rewardId)
    if (reward && reward.isAvailable) {
      // Add redemption record
      reward.redeemedBy.push({
        memberId,
        date: Date.now()
      })
      
      saveRewards()
      return true
    }
    return false
  }

  // Get all rewards redeemed by a specific member
  const getRedemptionsByMember = (memberId: string): { reward: Reward, date: number }[] => {
    const redemptions: { reward: Reward, date: number }[] = []
    
    rewards.value.forEach(reward => {
      reward.redeemedBy.forEach(record => {
        if (record.memberId === memberId) {
          redemptions.push({
            reward,
            date: record.date
          })
        }
      })
    })
    
    // Sort by date (newest first)
    return redemptions.sort((a, b) => b.date - a.date)
  }

  return {
    rewards: rewards.value,
    addReward,
    updateReward,
    deleteReward,
    getRewardById,
    redeemReward,
    getRedemptionsByMember,
    loadRewards,
    saveRewards
  }
}