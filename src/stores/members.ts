import { ref, computed, watch } from 'vue'
import { initConfig, getConfigRepo } from '../services/config'

export interface Member {
  id: string
  name: string
  color: string
  points: number
  createdAt: number
  completedTasks: string[]
  redeemedRewards: string[]
}

const members = ref<Member[]>([])
const currentMemberId = ref<string | null>(null)
let initialized = false

const loadMembers = async () => {
  const repo = await initConfig()
  try {
    const saved = repo.getConfig<Member[]>('/members')
    if (saved && Array.isArray(saved)) {
      members.value = saved
    }
  } catch (e) {
    console.warn('Failed to load members from config:', e)
    const savedMembers = localStorage.getItem('kidpoints-members')
    if (savedMembers) {
      members.value = JSON.parse(savedMembers)
    }
  }

  try {
    const savedCurrent = repo.getConfig<string>('/current-member')
    if (savedCurrent) {
      currentMemberId.value = savedCurrent
    }
  } catch (e) {
    const savedCurrentMember = localStorage.getItem('kidpoints-current-member')
    if (savedCurrentMember) {
      currentMemberId.value = savedCurrentMember
    }
  }

  initialized = true
}

const saveMembers = () => {
  if (!initialized) return
  try {
    const repo = getConfigRepo()
    repo.setConfig('/members', members.value)
  } catch (e) {
    console.warn('Failed to save members to config, falling back to localStorage:', e)
    localStorage.setItem('kidpoints-members', JSON.stringify(members.value))
  }
}

const saveCurrentMember = () => {
  if (!initialized) return
  try {
    const repo = getConfigRepo()
    if (currentMemberId.value) {
      repo.setConfig('/current-member', currentMemberId.value)
    } else {
      repo.setConfig('/current-member', null)
    }
  } catch (e) {
    if (currentMemberId.value) {
      localStorage.setItem('kidpoints-current-member', currentMemberId.value)
    } else {
      localStorage.removeItem('kidpoints-current-member')
    }
  }
}

watch(members, () => {
  saveMembers()
}, { deep: true })

watch(currentMemberId, () => {
  saveCurrentMember()
})

const currentMember = computed(() => {
  return members.value.find(m => m.id === currentMemberId.value) || null
})

let loadPromise: Promise<void> | null = null

const ensureLoaded = (): Promise<void> => {
  if (initialized) return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = loadMembers()
  return loadPromise
}

export function useMembers() {
  const addMember = (name: string, color: string) => {
    const newMember: Member = {
      id: Date.now().toString(),
      name,
      color,
      points: 0,
      createdAt: Date.now(),
      completedTasks: [],
      redeemedRewards: []
    }
    members.value.push(newMember)
    
    if (!currentMemberId.value) {
      setCurrentMember(newMember.id)
    }
    
    return newMember
  }

  const updateMember = (id: string, data: Partial<Member>) => {
    const index = members.value.findIndex(m => m.id === id)
    if (index !== -1) {
      members.value[index] = { ...members.value[index], ...data }
    }
  }

  const deleteMember = (id: string) => {
    members.value = members.value.filter(m => m.id !== id)
    if (currentMemberId.value === id) {
      currentMemberId.value = members.value.length > 0 ? members.value[0].id : null
    }
  }

  const setCurrentMember = (id: string | null) => {
    currentMemberId.value = id
  }

  const addPoints = (memberId: string, points: number) => {
    const member = members.value.find(m => m.id === memberId)
    if (member) {
      member.points += points
    }
  }

  const deductPoints = (memberId: string, points: number) => {
    const member = members.value.find(m => m.id === memberId)
    if (member && member.points >= points) {
      member.points -= points
      return true
    }
    return false
  }

  const completeTask = (memberId: string, taskId: string) => {
    const member = members.value.find(m => m.id === memberId)
    if (member && !member.completedTasks.includes(taskId)) {
      member.completedTasks.push(taskId)
    }
  }

  const revertTask = (memberId: string, taskId: string) => {
    const member = members.value.find(m => m.id === memberId)
    if (member) {
      member.completedTasks = member.completedTasks.filter(id => id !== taskId)
    }
  }

  const isTaskCompleted = (memberId: string, taskId: string) => {
    const member = members.value.find(m => m.id === memberId)
    return member?.completedTasks.includes(taskId) || false
  }

  const redeemReward = (memberId: string, rewardId: string) => {
    const member = members.value.find(m => m.id === memberId)
    if (member && !member.redeemedRewards.includes(rewardId)) {
      member.redeemedRewards.push(rewardId)
    }
  }

  const isRewardRedeemed = (memberId: string, rewardId: string) => {
    const member = members.value.find(m => m.id === memberId)
    return member?.redeemedRewards.includes(rewardId) || false
  }

  const resetMemberData = () => {
    members.value.forEach(member => {
      member.completedTasks = []
      member.redeemedRewards = []
    })
  }

  return {
    members,
    currentMember,
    currentMemberId,
    addMember,
    updateMember,
    deleteMember,
    setCurrentMember,
    addPoints,
    deductPoints,
    completeTask,
    revertTask,
    isTaskCompleted,
    redeemReward,
    isRewardRedeemed,
    resetMemberData,
    loadMembers: ensureLoaded,
    ensureLoaded
  }
}
