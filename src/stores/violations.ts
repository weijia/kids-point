import { ref, computed, watch } from 'vue'
import { loadDoc, saveDoc } from '../services/doc-store'

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
let initialized = false

const loadViolationRules = async () => {
  try {
    const saved = await loadDoc<ViolationRule[]>('violation-rules')
    if (saved && Array.isArray(saved)) violationRules.value = saved
  } catch (e) {
    console.warn('Failed to load violation rules from PouchDB:', e)
  }
}

const loadViolationRecords = async () => {
  try {
    const saved = await loadDoc<ViolationRecord[]>('violation-records')
    if (saved && Array.isArray(saved)) violationRecords.value = saved
  } catch (e) {
    console.warn('Failed to load violation records from PouchDB:', e)
  }
}

watch(violationRules, () => {
  if (initialized) void saveDoc('violation-rules', violationRules.value)
}, { deep: true })

watch(violationRecords, () => {
  if (initialized) void saveDoc('violation-records', violationRecords.value)
}, { deep: true })

let loadPromise: Promise<void> | null = null

const ensureLoaded = async (): Promise<void> => {
  if (initialized) return
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    await Promise.all([loadViolationRules(), loadViolationRecords()])
    initialized = true
  })()
  return loadPromise
}

export function useViolations() {
  const addViolationRule = (data: Omit<ViolationRule, 'id' | 'createdAt'>) => {
    const rule: ViolationRule = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now()
    }
    violationRules.value.push(rule)
    return rule
  }

  const updateViolationRule = (id: string, data: Partial<ViolationRule>) => {
    const index = violationRules.value.findIndex(r => r.id === id)
    if (index !== -1) violationRules.value[index] = { ...violationRules.value[index], ...data }
  }

  const deleteViolationRule = (id: string) => {
    violationRules.value = violationRules.value.filter(r => r.id !== id)
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
    return record
  }

  const deleteViolationRecord = (id: string) => {
    violationRecords.value = violationRecords.value.filter(r => r.id !== id)
  }

  const getViolationsByMember = (memberId: string) => {
    return computed(() => violationRecords.value
      .filter(r => r.memberId === memberId)
      .sort((a, b) => b.createdAt - a.createdAt))
  }

  const getViolationRule = (ruleId: string) => violationRules.value.find(r => r.id === ruleId)

  const getTotalDeductedPoints = (memberId: string) => {
    return computed(() => violationRecords.value
      .filter(r => r.memberId === memberId)
      .reduce((sum, r) => sum + r.deductedPoints, 0))
  }

  const getRecentViolations = (limit: number = 10) => {
    return computed(() => [...violationRecords.value]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit))
  }

  const resetViolationRecords = () => {
    violationRecords.value = []
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
    loadViolationRules: ensureLoaded,
    loadViolationRecords: ensureLoaded,
    ensureLoaded
  }
}
