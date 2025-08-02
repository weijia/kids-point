import { ref, computed, type Ref } from 'vue'

export interface Member {
  id: string
  name: string
  avatarColor: string
  points: number
  createdAt: number
  pointsHistory: PointHistoryEntry[]
  isAdmin?: boolean
}

export interface PointHistoryEntry {
  date: number
  points: number
  reason: string
  taskId?: string
  rewardId?: string
}

export interface MembersStore {
  members: Ref<Member[]>
  currentMember: Member | null
  setCurrentMember: (memberId: string) => void
  addMember: (name: string, avatarColor: string) => void
  updateMember: (id: string, data: Partial<Member>) => void
  deleteMember: (id: string) => void
  getMemberById: (id: string) => Member | undefined
  addPoints: (memberId: string, points: number, reason: string, taskId?: string) => void
  removePoints: (memberId: string, points: number, reason: string, rewardId?: string) => void
  getMemberPointsHistory: (memberId: string) => PointHistoryEntry[]
  getLeaderboard: () => Member[]
  getMembersRefs: () => Ref<Member>[]
  loadMembers: () => void
  saveMembers: () => void
}

export function useMembers(): MembersStore {
  const members = ref<Member[]>([])
  const currentMember = ref<Member | null>(null)

  // Load members from localStorage
  const loadMembers = () => {
    const savedMembers = localStorage.getItem('kidpoints-members')
    if (savedMembers) {
      members.value = JSON.parse(savedMembers)
      
      // Load current member if exists
      const currentMemberId = localStorage.getItem('kidpoints-current-member')
      if (currentMemberId) {
        const member = getMemberById(currentMemberId)
        if (member) {
          currentMember.value = member
        } else if (members.value.length > 0) {
          // If saved current member doesn't exist anymore, use the first member
          currentMember.value = members.value[0]
          localStorage.setItem('kidpoints-current-member', members.value[0].id)
        }
      } else if (members.value.length > 0) {
        // If no current member is saved, use the first member
        currentMember.value = members.value[0]
        localStorage.setItem('kidpoints-current-member', members.value[0].id)
      }
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
      pointsHistory: [],
      isAdmin: members.value.length === 0 // First member becomes admin
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
  const leaderboard = computed(() => {
    return [...members.value].sort((a, b) => b.points - a.points)
  })
  
  // Get all members as individual refs
  const getMembersRefs = (): Ref<Member>[] => {
    return members.value.map(member => ref(member))
  }
  
  // Set current member
  const setCurrentMember = (memberId: string) => {
    const member = getMemberById(memberId)
    if (member) {
      currentMember.value = member
      // Save current member ID to localStorage
      localStorage.setItem('kidpoints-current-member', memberId)
    }
  }

  return {
    members,
    get currentMember() { return currentMember.value },
    setCurrentMember,
    addMember,
    updateMember,
    deleteMember,
    getMemberById,
    addPoints,
    removePoints,
    getMemberPointsHistory,
    getLeaderboard: () => leaderboard.value,
    getMembersRefs,
    loadMembers,
    saveMembers
  }
}