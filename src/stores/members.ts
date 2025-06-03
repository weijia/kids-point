import { ref, computed } from 'vue'

export interface Member {
  id: string
  name: string
  avatarColor: string
  points: number
  createdAt: number
  pointsHistory: PointHistoryEntry[]
}

export interface PointHistoryEntry {
  date: number
  points: number
  reason: string
  taskId?: string
  rewardId?: string
}

export interface MembersStore {
  members: Member[]
  addMember: (name: string, avatarColor: string) => void
  updateMember: (id: string, data: Partial<Member>) => void
  deleteMember: (id: string) => void
  getMemberById: (id: string) => Member | undefined
  addPoints: (memberId: string, points: number, reason: string, taskId?: string) => void
  removePoints: (memberId: string, points: number, reason: string, rewardId?: string) => void
  getMemberPointsHistory: (memberId: string) => PointHistoryEntry[]
  getLeaderboard: () => Member[]
  loadMembers: () => void
  saveMembers: () => void
}

export function useMembers(): MembersStore {
  const members = ref<Member[]>([])

  // Load members from localStorage
  const loadMembers = () => {
    const savedMembers = localStorage.getItem('kidpoints-members')
    if (savedMembers) {
      members.value = JSON.parse(savedMembers)
    }
  }

  // Save members to localStorage
  const saveMembers = () => {
    localStorage.setItem('kidpoints-members', JSON.stringify(members.value))
  }

  // Add a new member
  const addMember = (name: string, avatarColor: string) => {
    const newMember: Member = {
      id: Date.now().toString(),
      name,
      avatarColor,
      points: 0,
      createdAt: Date.now(),
      pointsHistory: []
    }
    
    members.value.push(newMember)
    saveMembers()
  }

  // Update an existing member
  const updateMember = (id: string, data: Partial<Member>) => {
    const index = members.value.findIndex(member => member.id === id)
    if (index !== -1) {
      members.value[index] = { ...members.value[index], ...data }
      saveMembers()
    }
  }

  // Delete a member
  const deleteMember = (id: string) => {
    members.value = members.value.filter(member => member.id !== id)
    saveMembers()
  }

  // Get a member by ID
  const getMemberById = (id: string): Member | undefined => {
    return members.value.find(member => member.id === id)
  }

  // Add points to a member
  const addPoints = (memberId: string, points: number, reason: string, taskId?: string) => {
    const member = getMemberById(memberId)
    if (member) {
      // Add points to the member
      member.points += points
      
      // Add entry to points history
      member.pointsHistory.push({
        date: Date.now(),
        points,
        reason,
        taskId
      })
      
      // Save changes
      saveMembers()
    }
  }

  // Remove points from a member (for rewards)
  const removePoints = (memberId: string, points: number, reason: string, rewardId?: string) => {
    const member = getMemberById(memberId)
    if (member) {
      // Ensure points don't go below zero
      const pointsToRemove = Math.min(points, member.points)
      
      // Remove points from the member
      member.points -= pointsToRemove
      
      // Add entry to points history (with negative points)
      member.pointsHistory.push({
        date: Date.now(),
        points: -pointsToRemove,
        reason,
        rewardId
      })
      
      // Save changes
      saveMembers()
    }
  }

  // Get points history for a specific member
  const getMemberPointsHistory = (memberId: string): PointHistoryEntry[] => {
    const member = getMemberById(memberId)
    return member ? member.pointsHistory : []
  }

  // Get leaderboard (sorted by points)
  const getLeaderboard = computed(() => {
    return [...members.value].sort((a, b) => b.points - a.points)
  })

  return {
    members: members.value,
    addMember,
    updateMember,
    deleteMember,
    getMemberById,
    addPoints,
    removePoints,
    getMemberPointsHistory,
    getLeaderboard: () => getLeaderboard.value,
    loadMembers,
    saveMembers
  }
}