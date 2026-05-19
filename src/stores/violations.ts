import { ref, computed } from 'vue'

export interface ViolationRule {
  id: string
  title: string
  description: string
  icon: string
  pointsDeducted: number
  createdAt: number
}

export interface ViolationRecord {
  id: string
  ruleId: string
  memberId: string
  deductedPoints: number
  note: string
  createdAt: number
}

const violationRules = ref<ViolationRule[]>([])
const violationRecords = ref<ViolationRecord[]>([])

const loadViolationRules = () => {
  const saved = localStorage.getItem('kidpoints-violation-rules')
  if (saved) {
    violationRules.value = JSON.parse(saved)
  }
}

const loadViolationRecords = () => {
  const saved = localStorage.getItem('kidpoints-violation-records')
  if (saved) {
    violationRecords.value = JSON.parse(saved)
  }
}

const saveViolationRules = () => {
  localStorage.setItem('kidpoints-violation-rules', JSON.stringify(violationRules.value))
}

const saveViolationRecords = () => {
  localStorage.setItem('kidpoints-violation-records', JSON.stringify(violationRecords.value))
}

export function useViolations() {
  const addViolationRule = (data: Omit<ViolationRule, 'id' | 'createdAt'>) => {
    const rule: ViolationRule = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    }
    violationRules.value.push(rule)
    saveViolationRules()
    return rule
  }

  const updateViolationRule = (id: string, data: Partial<ViolationRule>) => {
    const index = violationRules.value.findIndex(r => r.id === id)
    if (index !== -1) {
      violationRules.value[index] = { ...violationRules.value[index], ...data }
      saveViolationRules()
    }
  }

  const deleteViolationRule = (id: string) => {
    violationRules.value = violationRules.value.filter(r => r.id !== id)
    saveViolationRules()
  }

  const recordViolation = (ruleId: string, memberId: string, note: string = ''): ViolationRecord | null => {
    const rule = violationRules.value.find(r => r.id === ruleId)
    if (!rule) return null

    const record: ViolationRecord = {
      id: Date.now().toString(),
      ruleId,
      memberId,
      deductedPoints: rule.pointsDeducted,
      note,
      createdAt: Date.now()
    }
    violationRecords.value.push(record)
    saveViolationRecords()
    return record
  }

  const deleteViolationRecord = (id: string) => {
    violationRecords.value = violationRecords.value.filter(r => r.id !== id)
    saveViolationRecords()
  }

  const getViolationsByMember = (memberId: string) => {
    return computed(() => {
      return violationRecords.value
        .filter(r => r.memberId === memberId)
        .sort((a, b) => b.createdAt - a.createdAt)
    })
  }

  const getViolationRule = (ruleId: string) => {
    return violationRules.value.find(r => r.id === ruleId)
  }

  const getTotalDeductedPoints = (memberId: string) => {
    return computed(() => {
      return violationRecords.value
        .filter(r => r.memberId === memberId)
        .reduce((sum, r) => sum + r.deductedPoints, 0)
    })
  }

  const getRecentViolations = (limit: number = 10) => {
    return computed(() => {
      return [...violationRecords.value]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
    })
  }

  const resetViolationRecords = () => {
    violationRecords.value = []
    saveViolationRecords()
  }

  return {
    violationRules,
    violationRecords,
    addViolationRule,
    updateViolationRule,
    deleteViolationRule,
    recordViolation,
    deleteViolationRecord,
    getViolationsByMember,
    getViolationRule,
    getTotalDeductedPoints,
    getRecentViolations,
    resetViolationRecords,
    loadViolationRules,
    loadViolationRecords
  }
}
