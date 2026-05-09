import { ref } from 'vue'

export interface Reward {
  id: string
  title: string
  description: string
  icon: string
  points: number
  createdAt: number
}

const rewards = ref<Reward[]>([])

const loadRewards = () => {
  const savedRewards = localStorage.getItem('kidpoints-rewards')
  if (savedRewards) {
    rewards.value = JSON.parse(savedRewards)
  }
}

const saveRewards = () => {
  localStorage.setItem('kidpoints-rewards', JSON.stringify(rewards.value))
}

export function useRewards() {
  const addReward = (data: Omit<Reward, 'id' | 'createdAt'>) => {
    const newReward: Reward = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    }
    rewards.value.push(newReward)
    saveRewards()
    return newReward
  }

  const updateReward = (id: string, data: Partial<Reward>) => {
    const index = rewards.value.findIndex(r => r.id === id)
    if (index !== -1) {
      rewards.value[index] = { ...rewards.value[index], ...data }
      saveRewards()
    }
  }

  const deleteReward = (id: string) => {
    rewards.value = rewards.value.filter(r => r.id !== id)
    saveRewards()
  }

  return {
    rewards,
    addReward,
    updateReward,
    deleteReward,
    loadRewards
  }
}
