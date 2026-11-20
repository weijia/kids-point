import { ref, computed, watch } from 'vue'
import { loadDoc, saveDoc } from '../services/doc-store'

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
  try {
    const saved = await loadDoc<Member[]>('members')
    if (saved && Array.isArray(saved)) members.value = saved
  } catch (e) {
    console.warn('Failed to load members from PouchDB:', e)
  }

  try {
    const savedCurrent = await loadDoc<string | null>('current-member')
    if (savedCurrent) currentMemberId.value = savedCurrent
  } catch (e) {
    console.warn('Failed to load current member from PouchDB:', e)
  }

  initialized = true
}

watch(members, () => {
  if (initialized) void saveDoc('members', members.value)
}, { deep: true })

watch(currentMemberId, () => {
  if (initialized) void saveDoc('current-member', currentMemberId.value)
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
    if (!currentMemberId.value) setCurrentMember(newMember.id)
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
    if (member) member.points += points
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
    return members.value.find(m => m.id === memberId)?.completedTasks.includes(taskId) || false
  }

  const redeemReward = (memberId: string, rewardId: string) => {
    const member = members.value.find(m => m.id === memberId)
    if (member && !member.redeemedRewards.includes(rewardId)) {
      member.redeemedRewards.push(rewardId)
    }
  }

  const isRewardRedeemed = (memberId: string, rewardId: string) => {
    return members.value.find(m => m.id === memberId)?.redeemedRewards.includes(rewardId) || false
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
