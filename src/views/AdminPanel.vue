<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettings, type WebDAVSyncConfig } from '../stores/settings'
import { useRewards } from '../stores/rewards'
import { useAchievements } from '../stores/achievements'
import { useViolations } from '../stores/violations'
import { useMembers } from '../stores/members'
import { databaseService, type SyncStatus } from '../services/database'
import {
  getConfigRepoInfo,
  listConfigEntries,
  getSyncStatuses,
  flushSync,
  listConflicts,
  readConflictBackup,
  resolveConflict,
  getBackends,
  addBackend,
  removeBackend,
  listBackendMetadata,
  getBackendMetadata,
  deleteConfigByPath,
  type ConfigRepoInfo,
  type SyncStatusInfo,
  type BackendDescriptor,
  type BackendMetadata,
} from '../services/config'

const { t } = useI18n()
const router = useRouter()
const settingsStore = useSettings()
const rewardsStore = useRewards()
const achievementsStore = useAchievements()
const violationsStore = useViolations()
const membersStore = useMembers()

violationsStore.loadViolationRules()
violationsStore.loadViolationRecords()
membersStore.loadMembers()

const newReward = ref({
  title: '',
  description: '',
  icon: '🎁',
  points: 50
})

const newAchievement = ref({
  title: '',
  description: '',
  icon: '🏆',
  requirement: {
    type: 'taskCount' as 'taskCount' | 'pointsTotal' | 'rewardsRedeemed' | 'custom',
    count: 5,
    taskType: ''
  }
})

const webdavConfig = ref({
  url: '',
  username: '',
  password: '',
  enabled: false
})

const syncStatus = ref<SyncStatus>('idle')
const syncMessage = ref('')

const rewardIconOptions = [
  '🎁', '🧸', '🎮', '🍦', '🍕', '🎬', '📱', '⌚', '🎨', '📚', '🎯', '🎪', '🏖️', '🎭', '🎠'
]

const achievementIconOptions = [
  '🏆', '🥇', '🏅', '🎖️', '⭐', '🌟', '🚀', '🔥', '💯', '👑', '💪', '🧠', '❤️', '🌈', '✨'
]

const violationIconOptions = [
  '⚠️', '🚫', '❌', '😠', '📵', '⏰', '🧹', '📱', '💻', '🍽️', '😴', '🎮'
]

const newViolationRule = ref({
  title: '',
  description: '',
  icon: '⚠️',
  pointsDeducted: 5
})

const newViolation = ref({
  memberId: '',
  ruleId: '',
  note: ''
})

const activeTab = ref('rewards')

const rewards = computed(() => rewardsStore.rewards)
const achievements = computed(() => achievementsStore.achievements)
const violationRules = computed(() => violationsStore.violationRules)
const violationRecords = computed(() => violationsStore.getRecentViolations(20))
const members = computed(() => membersStore.members)

const hasWebDAVConfig = computed(() => settingsStore.settings.webdavSync !== null)
const isWebDAVEnabled = computed(() => settingsStore.settings.webdavSync?.enabled === true)

const addReward = () => {
  if (newReward.value.title.trim() === '') return
  
  rewardsStore.addReward({
    title: newReward.value.title.trim(),
    description: newReward.value.description.trim(),
    icon: newReward.value.icon,
    points: newReward.value.points
  })
  
  newReward.value = {
    title: '',
    description: '',
    icon: '🎁',
    points: 50
  }
}

const addAchievement = () => {
  if (newAchievement.value.title.trim() === '') return
  
  achievementsStore.addAchievement({
    title: newAchievement.value.title.trim(),
    description: newAchievement.value.description.trim(),
    icon: newAchievement.value.icon,
    requirement: { ...newAchievement.value.requirement }
  })
  
  newAchievement.value = {
    title: '',
    description: '',
    icon: '🏆',
    requirement: {
      type: 'taskCount',
      count: 5,
      taskType: ''
    }
  }
}

const deleteReward = (id: string) => {
  const confirmed = confirm(t('admin.confirmDelete'))
  if (confirmed) {
    rewardsStore.deleteReward(id)
  }
}

const deleteAchievement = (id: string) => {
  const confirmed = confirm(t('admin.confirmDelete'))
  if (confirmed) {
    achievementsStore.deleteAchievement(id)
  }
}

const addViolationRuleHandler = () => {
  if (newViolationRule.value.title.trim() === '') return
  
  violationsStore.addViolationRule({
    title: newViolationRule.value.title.trim(),
    description: newViolationRule.value.description.trim(),
    icon: newViolationRule.value.icon,
    pointsDeducted: newViolationRule.value.pointsDeducted
  })
  
  newViolationRule.value = {
    title: '',
    description: '',
    icon: '⚠️',
    pointsDeducted: 5
  }
}

const recordViolationHandler = () => {
  if (newViolation.value.memberId === '' || newViolation.value.ruleId === '') return
  
  const rule = violationsStore.getViolationRule(newViolation.value.ruleId)
  if (!rule) return
  
  violationsStore.recordViolation(
    newViolation.value.ruleId,
    newViolation.value.memberId,
    newViolation.value.note.trim()
  )
  
  membersStore.deductPoints(newViolation.value.memberId, rule.pointsDeducted)
  
  newViolation.value = {
    memberId: '',
    ruleId: '',
    note: ''
  }
}

const deleteViolationRule = (id: string) => {
  const confirmed = confirm(t('admin.confirmDelete'))
  if (confirmed) {
    violationsStore.deleteViolationRule(id)
  }
}

const deleteViolationRecord = (id: string) => {
  const confirmed = confirm(t('admin.confirmDelete'))
  if (confirmed) {
    violationsStore.deleteViolationRecord(id)
  }
}

const getMemberName = (memberId: string) => {
  const member = membersStore.members.value.find(m => m.id === memberId)
  return member ? member.name : '-'
}

const getRuleTitle = (ruleId: string) => {
  const rule = violationsStore.getViolationRule(ruleId)
  return rule ? rule.title : '-'
}

const getRuleIcon = (ruleId: string) => {
  const rule = violationsStore.getViolationRule(ruleId)
  return rule ? rule.icon : '⚠️'
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

const saveWebDAVConfig = () => {
  const config: WebDAVSyncConfig = {
    url: webdavConfig.value.url,
    username: webdavConfig.value.username,
    password: webdavConfig.value.password,
    enabled: webdavConfig.value.enabled,
    lastSyncTime: settingsStore.settings.webdavSync?.lastSyncTime || null
  }
  settingsStore.configureWebDAV(config)
  syncMessage.value = t('webdav.configSaved')
  setTimeout(() => syncMessage.value = '', 3000)
}

const testWebDAVConnection = async () => {
  try {
    syncStatus.value = 'syncing'
    syncMessage.value = t('webdav.syncing')
    
    await databaseService.initialize('kidspoints')
    await databaseService.configureWebDAV({
      url: webdavConfig.value.url,
      username: webdavConfig.value.username,
      password: webdavConfig.value.password
    })
    
    syncMessage.value = t('webdav.connectionSuccess')
    syncStatus.value = 'synced'
    setTimeout(() => {
      syncMessage.value = ''
      syncStatus.value = 'idle'
    }, 3000)
  } catch (error) {
    syncMessage.value = t('webdav.connectionFailed') + ': ' + (error as Error).message
    syncStatus.value = 'error'
  }
}

const syncNow = async () => {
  try {
    syncStatus.value = 'syncing'
    syncMessage.value = t('webdav.syncing')
    
    await databaseService.syncToWebDAV()
    
    if (settingsStore.settings.webdavSync) {
      settingsStore.configureWebDAV({
        ...settingsStore.settings.webdavSync,
        lastSyncTime: Date.now()
      })
    }
    
    syncMessage.value = t('webdav.syncSuccess')
    syncStatus.value = 'synced'
    setTimeout(() => {
      syncMessage.value = ''
      syncStatus.value = 'idle'
    }, 3000)
  } catch (error) {
    syncMessage.value = t('webdav.syncFailed') + ': ' + (error as Error).message
    syncStatus.value = 'error'
  }
}

const loadFromWebDAV = async () => {
  try {
    syncStatus.value = 'syncing'
    syncMessage.value = t('webdav.syncing')
    
    await databaseService.loadFromWebDAV()
    
    syncMessage.value = t('webdav.loadSuccess')
    syncStatus.value = 'synced'
    setTimeout(() => {
      syncMessage.value = ''
      syncStatus.value = 'idle'
    }, 3000)
  } catch (error) {
    syncMessage.value = t('webdav.loadFailed') + ': ' + (error as Error).message
    syncStatus.value = 'error'
  }
}

const disableWebDAV = () => {
  settingsStore.disableWebDAV()
  webdavConfig.value.enabled = false
  syncMessage.value = t('webdav.syncDisabled')
  setTimeout(() => syncMessage.value = '', 3000)
}

const formatLastSync = computed(() => {
  if (!settingsStore.settings.webdavSync?.lastSyncTime) return t('webdav.never')
  return new Date(settingsStore.settings.webdavSync.lastSyncTime).toLocaleString()
})

const resetAllData = () => {
  const confirmed = confirm(t('admin.resetWarning') + '\n' + t('admin.resetConfirm'))
  
  if (confirmed) {
    settingsStore.resetData()
    alert(t('common.success'))
  }
}

const logout = () => {
  settingsStore.logout()
  router.push('/admin-login')
}

const initWebDAVForm = () => {
  if (settingsStore.settings.webdavSync) {
    webdavConfig.value = {
      url: settingsStore.settings.webdavSync.url,
      username: settingsStore.settings.webdavSync.username,
      password: settingsStore.settings.webdavSync.password,
      enabled: settingsStore.settings.webdavSync.enabled
    }
  }
}

// zen-fs-config 配置管理
const configRepoInfo = ref<ConfigRepoInfo | null>(null)
const configEntries = ref<Array<{ path: string; value: unknown; sizeBytes?: number }>>([])
const syncStatuses = ref<SyncStatusInfo[]>([])
const conflicts = ref<any[]>([])
const configMessage = ref('')
const configMessageType = ref<'info' | 'success' | 'error'>('info')
const configLoading = ref(false)
const expandedPaths = ref<Set<string>>(new Set())
const editingPath = ref<string | null>(null)
const editingValue = ref('')

// 后端拓扑管理
const backends = ref<BackendDescriptor[]>([])
const backendMetaList = ref<BackendMetadata[]>([])
const addBackendDialog = ref(false)
const newBackendId = ref('')
const newBackendType = ref('WebDAV')
const newBackendDescription = ref('')
const newBackendOptions = ref<Record<string, string>>({})
const newBackendFormFields = ref<any[]>([])

// 冲突查看器
const conflictViewer = ref<{
  open: boolean
  conflictId: string
  source: string
  target: string
  resolved: string
  merged: string
} | null>(null)

const togglePath = (path: string) => {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path)
  } else {
    expandedPaths.value.add(path)
  }
}

const formatConfigValue = (value: unknown): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const getConfigSize = (value: unknown): string => {
  try {
    const json = JSON.stringify(value)
    const bytes = new Blob([json]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  } catch {
    return '-'
  }
}

const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const showConfigMessage = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
  configMessage.value = msg
  configMessageType.value = type
  setTimeout(() => {
    configMessage.value = ''
  }, 3000)
}

const loadConfigInfo = async () => {
  configLoading.value = true
  try {
    const [info, entries, statuses, confs, bknds, metaList] = await Promise.all([
      getConfigRepoInfo(),
      listConfigEntries('/'),
      getSyncStatuses(),
      listConflicts(),
      getBackends(),
      (() => {
        // initConfig 之后 backend registry 才会填充；如果未初始化这里返回空也可以
        try { return listBackendMetadata() } catch { return [] }
      })(),
    ])
    configRepoInfo.value = info
    configEntries.value = entries
    syncStatuses.value = statuses
    conflicts.value = confs
    backends.value = bknds
    backendMetaList.value = metaList
  } catch (e) {
    showConfigMessage(t('config.loadFailed') + ': ' + (e as Error).message, 'error')
  } finally {
    configLoading.value = false
  }
}

const handleFlushSync = async () => {
  try {
    configLoading.value = true
    await flushSync()
    showConfigMessage(t('config.flushSuccess'), 'success')
    await loadConfigInfo()
  } catch (e) {
    showConfigMessage(t('config.flushFailed') + ': ' + (e as Error).message, 'error')
  } finally {
    configLoading.value = false
  }
}

const startEdit = (path: string) => {
  const entry = configEntries.value.find(e => e.path === path)
  if (!entry) return
  editingPath.value = path
  editingValue.value = formatConfigValue(entry.value)
}

const cancelEdit = () => {
  editingPath.value = null
  editingValue.value = ''
}

const saveEdit = async () => {
  if (!editingPath.value) return
  try {
    const parsed = JSON.parse(editingValue.value)
    const { getConfigRepo } = await import('../services/config')
    getConfigRepo().setConfig(editingPath.value, parsed)
    showConfigMessage(t('config.saveSuccess'), 'success')
    cancelEdit()
    await loadConfigInfo()
  } catch (e) {
    showConfigMessage(t('config.saveFailed') + ': ' + (e as Error).message, 'error')
  }
}

const deleteConfig = async (path: string) => {
  const confirmed = confirm(t('config.confirmDelete'))
  if (!confirmed) return
  try {
    // 使用 repo.deleteFile → 自动写入墓碑，同步时把删除传播到所有副本
    await deleteConfigByPath(path)
    showConfigMessage(t('config.deleteSuccess'), 'success')
    await loadConfigInfo()
  } catch (e) {
    showConfigMessage(t('config.deleteFailed') + ': ' + (e as Error).message, 'error')
  }
}

// ========== 后端管理 ==========

const openAddBackendDialog = () => {
  const meta = backendMetaList.value.find(m => m.type === newBackendType.value)
  if (meta) {
    newBackendFormFields.value = meta.fields
    newBackendOptions.value = { ...meta.defaultOptions }
  } else {
    newBackendFormFields.value = []
    newBackendOptions.value = {}
  }
  newBackendId.value = ''
  newBackendDescription.value = ''
  addBackendDialog.value = true
}

const onBackendTypeChange = () => {
  const meta = getBackendMetadata(newBackendType.value)
  if (meta) {
    newBackendFormFields.value = meta.fields
    newBackendOptions.value = { ...meta.defaultOptions }
  } else {
    newBackendFormFields.value = []
    newBackendOptions.value = {}
  }
}

const handleAddBackend = async () => {
  if (!newBackendId.value.trim()) {
    showConfigMessage('请填写后端 ID', 'error')
    return
  }
  // 校验 required 字段
  const meta = getBackendMetadata(newBackendType.value)
  if (meta) {
    for (const f of meta.fields) {
      if (f.required && !String(newBackendOptions.value[f.key] ?? '').trim()) {
        showConfigMessage(`必填字段缺失：${f.label}`, 'error')
        return
      }
    }
  }
  try {
    configLoading.value = true
    await addBackend(
      newBackendId.value.trim(),
      newBackendType.value,
      { ...newBackendOptions.value },
      newBackendDescription.value.trim() || undefined,
    )
    showConfigMessage('后端已添加并建立同步', 'success')
    addBackendDialog.value = false
    await loadConfigInfo()
  } catch (e) {
    showConfigMessage('添加后端失败：' + (e as Error).message, 'error')
  } finally {
    configLoading.value = false
  }
}

const handleRemoveBackend = async (id: string) => {
  if (id === 'local-idb') {
    showConfigMessage('本地 IndexedDB 主后端不可删除', 'error')
    return
  }
  const confirmed = confirm(`确定要移除后端 "${id}" 吗？\n此操作仅解除同步关系，不会删除本地 IndexedDB 中的数据。`)
  if (!confirmed) return
  try {
    configLoading.value = true
    await removeBackend(id)
    showConfigMessage('后端已移除', 'success')
    await loadConfigInfo()
  } catch (e) {
    showConfigMessage('移除后端失败：' + (e as Error).message, 'error')
  } finally {
    configLoading.value = false
  }
}

// ========== 冲突处理 ==========

/**
 * 从 ConflictArchive.sourceBackupPath 推导冲突 ID（meta.json 路径）
 *   例：.meta/.conflicts/1700000000_settings.conflict/source.json
 *   →   .meta/.conflicts/1700000000_settings.conflict/meta.json
 */
const deriveConflictId = (archive: any): string => {
  const backupPath: string = archive.sourceBackupPath || archive.targetBackupPath || ''
  if (!backupPath) return ''
  const dir = backupPath.split('/').slice(0, -1).join('/')
  return dir + '/meta.json'
}

const openConflictViewer = async (archive: any) => {
  const cid = deriveConflictId(archive)
  if (!cid) {
    showConfigMessage('无法定位冲突备份文件', 'error')
    return
  }
  try {
    configLoading.value = true
    const [source, target, resolved] = await Promise.all([
      readConflictBackup(cid, 'source').catch(() => ''),
      readConflictBackup(cid, 'target').catch(() => ''),
      readConflictBackup(cid, 'resolved').catch(() => ''),
    ])
    conflictViewer.value = {
      open: true,
      conflictId: cid,
      source,
      target,
      resolved,
      merged: resolved || source,
    }
  } catch (e) {
    showConfigMessage('读取冲突备份失败：' + (e as Error).message, 'error')
  } finally {
    configLoading.value = false
  }
}

const closeConflictViewer = () => {
  conflictViewer.value = null
}

const handleResolveConflict = async () => {
  if (!conflictViewer.value) return
  try {
    configLoading.value = true
    let merged: unknown = conflictViewer.value.merged
    try {
      merged = JSON.parse(conflictViewer.value.merged)
    } catch {
      /* 非 JSON 内容直接作为字符串 */
    }
    await resolveConflict(conflictViewer.value.conflictId, merged)
    showConfigMessage('冲突已解决', 'success')
    closeConflictViewer()
    await loadConfigInfo()
  } catch (e) {
    showConfigMessage('解决冲突失败：' + (e as Error).message, 'error')
  } finally {
    configLoading.value = false
  }
}

const initConfigForm = () => {
  loadConfigInfo()
}
</script>

<template>
  <div class="admin-panel">
    <div class="page-header">
      <h1>{{ t('admin.title') }}</h1>
    </div>
    
    <div class="admin-tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'rewards' }"
        @click="activeTab = 'rewards'"
      >
        🎁 {{ t('admin.rewards') }}
      </button>
      
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'achievements' }"
        @click="activeTab = 'achievements'"
      >
        🏆 {{ t('admin.achievements') }}
      </button>
      
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'violations' }"
        @click="activeTab = 'violations'"
      >
        ⚠️ {{ t('violations.title') }}
      </button>
      
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'webdav' }"
        @click="activeTab = 'webdav'; initWebDAVForm()"
      >
        ☁️ {{ t('admin.webdav') }}
      </button>
      
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'settings' }"
        @click="activeTab = 'settings'"
      >
        ⚙️ {{ t('admin.settings') }}
      </button>
      
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'config' }"
        @click="activeTab = 'config'; initConfigForm()"
      >
        🗂️ {{ t('config.title') }}
      </button>
    </div>
    
    <div class="tab-content" v-if="activeTab === 'rewards'">
      <div class="card form-card">
        <h2>{{ t('admin.createReward') }}</h2>
        
        <div class="form-row">
          <div class="input-group">
            <label for="reward-title">{{ t('admin.rewardTitle') }}</label>
            <input 
              type="text" 
              id="reward-title" 
              v-model="newReward.title" 
              :placeholder="t('admin.rewardTitle')"
            />
          </div>
          
          <div class="input-group">
            <label for="reward-points">{{ t('admin.rewardPoints') }}</label>
            <input 
              type="number" 
              id="reward-points" 
              v-model.number="newReward.points" 
              min="1" 
              max="1000"
            />
          </div>
        </div>
        
        <div class="input-group">
          <label for="reward-description">{{ t('admin.rewardDescription') }}</label>
          <textarea 
            id="reward-description" 
            v-model="newReward.description" 
            :placeholder="t('admin.rewardDescription')"
            rows="2"
          ></textarea>
        </div>
        
        <div class="input-group">
          <label>{{ t('tasks.taskIcon') }}</label>
          <div class="icon-picker">
            <div 
              v-for="icon in rewardIconOptions" 
              :key="icon" 
              class="icon-option"
              :class="{ 'selected': newReward.icon === icon }"
              @click="newReward.icon = icon"
            >
              {{ icon }}
            </div>
          </div>
        </div>
        
        <button class="btn btn-primary" @click="addReward">{{ t('admin.createReward') }}</button>
      </div>
      
      <div class="rewards-list">
        <h2>{{ t('admin.rewards') }}</h2>
        
        <div v-if="rewards.value.length === 0" class="empty-state">
          <p>{{ t('store.noRewards') }}</p>
        </div>
        
        <div v-else class="admin-list">
          <div v-for="reward in rewards.value" :key="reward.id" class="admin-list-item">
            <div class="item-icon">{{ reward.icon }}</div>
            <div class="item-content">
              <h3>{{ reward.title }}</h3>
              <p>{{ reward.description }}</p>
              <div class="item-points">{{ reward.points }} {{ t('members.points') }}</div>
            </div>
            <button class="btn btn-danger delete-btn" @click="deleteReward(reward.id)">{{ t('admin.delete') }}</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="tab-content" v-if="activeTab === 'achievements'">
      <div class="card form-card">
        <h2>{{ t('admin.createAchievement') }}</h2>
        
        <div class="form-row">
          <div class="input-group">
            <label for="achievement-title">{{ t('admin.achievementTitle') }}</label>
            <input 
              type="text" 
              id="achievement-title" 
              v-model="newAchievement.title" 
              :placeholder="t('admin.achievementTitle')"
            />
          </div>
          
          <div class="input-group">
            <label for="achievement-type">{{ t('admin.achievementType') }}</label>
            <select id="achievement-type" v-model="newAchievement.requirement.type">
              <option value="taskCount">{{ t('admin.taskCount') }}</option>
              <option value="pointsTotal">{{ t('admin.pointsTotal') }}</option>
              <option value="rewardsRedeemed">{{ t('admin.rewardsRedeemed') }}</option>
              <option value="custom">{{ t('admin.custom') }}</option>
            </select>
          </div>
        </div>
        
        <div class="input-group">
          <label for="achievement-description">{{ t('admin.rewardDescription') }}</label>
          <textarea 
            id="achievement-description" 
            v-model="newAchievement.description" 
            :placeholder="t('admin.rewardDescription')"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-row">
          <div class="input-group">
            <label for="requirement-count">{{ t('admin.requirementCount') }}</label>
            <input 
              type="number" 
              id="requirement-count" 
              v-model.number="newAchievement.requirement.count" 
              min="1" 
              max="1000"
            />
          </div>
        </div>
        
        <div class="input-group">
          <label>{{ t('tasks.taskIcon') }}</label>
          <div class="icon-picker">
            <div 
              v-for="icon in achievementIconOptions" 
              :key="icon" 
              class="icon-option"
              :class="{ 'selected': newAchievement.icon === icon }"
              @click="newAchievement.icon = icon"
            >
              {{ icon }}
            </div>
          </div>
        </div>
        
        <button class="btn btn-primary" @click="addAchievement">{{ t('admin.createAchievement') }}</button>
      </div>
      
      <div class="achievements-list">
        <h2>{{ t('admin.achievements') }}</h2>
        
        <div v-if="achievements.value.length === 0" class="empty-state">
          <p>{{ t('achievements.noAchievements') }}</p>
        </div>
        
        <div v-else class="admin-list">
          <div v-for="achievement in achievements.value" :key="achievement.id" class="admin-list-item">
            <div class="item-icon">{{ achievement.icon }}</div>
            <div class="item-content">
              <h3>{{ achievement.title }}</h3>
              <p>{{ achievement.description }}</p>
              <div class="item-requirement">
                {{ t('achievements.requirement') }}: {{ achievement.requirement.count }} 
                {{ achievement.requirement.type === 'taskCount' ? t('admin.taskCount') : 
                   achievement.requirement.type === 'pointsTotal' ? t('admin.pointsTotal') : 
                   achievement.requirement.type === 'rewardsRedeemed' ? t('admin.rewardsRedeemed') : 
                   t('admin.custom') }}
              </div>
            </div>
            <button class="btn btn-danger delete-btn" @click="deleteAchievement(achievement.id)">{{ t('admin.delete') }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-content" v-if="activeTab === 'violations'">
      <div class="card form-card">
        <h2>{{ t('violations.addRule') }}</h2>
        
        <div class="form-row">
          <div class="input-group">
            <label for="violation-title">{{ t('violations.ruleTitle') }}</label>
            <input 
              type="text" 
              id="violation-title" 
              v-model="newViolationRule.title" 
              :placeholder="t('violations.ruleTitle')"
            />
          </div>
          
          <div class="input-group">
            <label for="violation-points">{{ t('violations.pointsDeducted') }}</label>
            <input 
              type="number" 
              id="violation-points" 
              v-model.number="newViolationRule.pointsDeducted" 
              min="1" 
              max="1000"
            />
          </div>
        </div>
        
        <div class="input-group">
          <label for="violation-description">{{ t('admin.rewardDescription') }}</label>
          <textarea 
            id="violation-description" 
            v-model="newViolationRule.description" 
            :placeholder="t('admin.rewardDescription')"
            rows="2"
          ></textarea>
        </div>
        
        <div class="input-group">
          <label>{{ t('tasks.taskIcon') }}</label>
          <div class="icon-picker">
            <div 
              v-for="icon in violationIconOptions" 
              :key="icon" 
              class="icon-option"
              :class="{ 'selected': newViolationRule.icon === icon }"
              @click="newViolationRule.icon = icon"
            >
              {{ icon }}
            </div>
          </div>
        </div>
        
        <button class="btn btn-primary" @click="addViolationRuleHandler">{{ t('violations.addRule') }}</button>
      </div>
      
      <div class="card form-card">
        <h2>{{ t('violations.recordViolation') }}</h2>
        
        <div class="form-row">
          <div class="input-group">
            <label for="select-member">{{ t('violations.selectMember') }}</label>
            <select id="select-member" v-model="newViolation.memberId">
              <option value="">{{ t('violations.selectMember') }}</option>
              <option v-for="member in members.value" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
          </div>
          
          <div class="input-group">
            <label for="select-rule">{{ t('violations.selectRule') }}</label>
            <select id="select-rule" v-model="newViolation.ruleId">
              <option value="">{{ t('violations.selectRule') }}</option>
              <option v-for="rule in violationRules.value" :key="rule.id" :value="rule.id">
                {{ rule.icon }} {{ rule.title }} (-{{ rule.pointsDeducted }})
              </option>
            </select>
          </div>
        </div>
        
        <div class="input-group">
          <label for="violation-note">{{ t('violations.note') }}</label>
          <textarea 
            id="violation-note" 
            v-model="newViolation.note" 
            :placeholder="t('violations.note')"
            rows="2"
          ></textarea>
        </div>
        
        <button class="btn btn-danger" @click="recordViolationHandler">{{ t('violations.record') }}</button>
      </div>
      
      <div class="violations-list">
        <h2>{{ t('violations.history') }}</h2>
        
        <div v-if="violationRules.value.length === 0" class="empty-state">
          <p>{{ t('violations.noRules') }}</p>
        </div>
        
        <div v-else>
          <h3>{{ t('violations.rule') }}</h3>
          <div class="admin-list">
            <div v-for="rule in violationRules.value" :key="rule.id" class="admin-list-item">
              <div class="item-icon">{{ rule.icon }}</div>
              <div class="item-content">
                <h3>{{ rule.title }}</h3>
                <p>{{ rule.description }}</p>
                <div class="item-points">{{ t('violations.deductPoints', { points: rule.pointsDeducted }) }}</div>
              </div>
              <button class="btn btn-danger delete-btn" @click="deleteViolationRule(rule.id)">{{ t('violations.delete') }}</button>
            </div>
          </div>
        </div>
        
        <div class="violations-history" style="margin-top: var(--space-xl);">
          <h3>{{ t('violations.history') }}</h3>
          
          <div v-if="violationRecords.value.length === 0" class="empty-state">
            <p>{{ t('violations.noRecords') }}</p>
          </div>
          
          <div v-else class="admin-list">
            <div v-for="record in violationRecords.value" :key="record.id" class="admin-list-item">
              <div class="item-icon">{{ getRuleIcon(record.ruleId) }}</div>
              <div class="item-content">
                <h3>{{ getMemberName(record.memberId) }} - {{ getRuleTitle(record.ruleId) }}</h3>
                <p v-if="record.note">{{ record.note }}</p>
                <div class="item-points">{{ t('violations.deductPoints', { points: record.deductedPoints }) }}</div>
                <div class="item-time">{{ t('violations.time') }}: {{ formatTime(record.createdAt) }}</div>
              </div>
              <button class="btn btn-danger delete-btn" @click="deleteViolationRecord(record.id)">{{ t('violations.delete') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-content" v-if="activeTab === 'webdav'">
      <div class="card webdav-card">
        <h2>☁️ {{ t('webdav.title') }}</h2>
        <p class="webdav-description">
          {{ t('webdav.description') }}
        </p>
        
        <div v-if="syncMessage" class="sync-message" :class="syncStatus">
          {{ syncMessage }}
        </div>
        
        <div class="form-section">
          <h3>{{ t('webdav.serverConfig') }}</h3>
          
          <div class="input-group">
            <label for="webdav-url">{{ t('webdav.url') }}</label>
            <input 
              type="text" 
              id="webdav-url" 
              v-model="webdavConfig.url" 
              :placeholder="t('webdav.url')"
            />
          </div>
          
          <div class="form-row">
            <div class="input-group">
              <label for="webdav-username">{{ t('webdav.username') }}</label>
              <input 
                type="text" 
                id="webdav-username" 
                v-model="webdavConfig.username" 
                :placeholder="t('webdav.username')"
              />
            </div>
            
            <div class="input-group">
              <label for="webdav-password">{{ t('webdav.password') }}</label>
              <input 
                type="password" 
                id="webdav-password" 
                v-model="webdavConfig.password" 
                :placeholder="t('webdav.password')"
              />
            </div>
          </div>
          
          <div class="input-group checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="webdavConfig.enabled"
              />
              <span>{{ t('webdav.enableAutoSync') }}</span>
            </label>
          </div>
        </div>
        
        <div class="button-group">
          <button class="btn btn-secondary" @click="testWebDAVConnection">
            🔗 {{ t('webdav.testConnection') }}
          </button>
          <button class="btn btn-primary" @click="saveWebDAVConfig">
            💾 {{ t('webdav.saveConfig') }}
          </button>
        </div>
        
        <div v-if="hasWebDAVConfig" class="sync-section">
          <h3>{{ t('webdav.syncStatus') }}</h3>
          
          <div class="sync-info">
            <div class="sync-info-item">
              <span class="label">{{ t('webdav.status') }}:</span>
              <span class="value" :class="'status-' + syncStatus">
                {{ syncStatus === 'idle' ? t('webdav.idle') : 
                   syncStatus === 'syncing' ? t('webdav.syncing') : 
                   syncStatus === 'synced' ? t('webdav.synced') : t('webdav.error') }}
              </span>
            </div>
            <div class="sync-info-item">
              <span class="label">{{ t('webdav.lastSync') }}:</span>
              <span class="value">{{ formatLastSync }}</span>
            </div>
            <div class="sync-info-item">
              <span class="label">{{ t('webdav.enabled') }}:</span>
              <span class="value">{{ isWebDAVEnabled ? t('common.yes') : t('common.no') }}</span>
            </div>
          </div>
          
          <div class="button-group">
            <button class="btn btn-primary" @click="syncNow" :disabled="syncStatus === 'syncing'">
              📤 {{ t('webdav.syncToWebDAV') }}
            </button>
            <button class="btn btn-secondary" @click="loadFromWebDAV" :disabled="syncStatus === 'syncing'">
              📥 {{ t('webdav.loadFromWebDAV') }}
            </button>
          </div>
          
          <div class="danger-zone">
            <button class="btn btn-danger" @click="disableWebDAV">
              🚫 {{ t('webdav.disableWebDAV') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="tab-content" v-if="activeTab === 'settings'">
      <div class="card settings-card">
        <h2>{{ t('admin.systemSettings') }}</h2>
        
        <div class="settings-section">
          <h3>{{ t('admin.dataManagement') }}</h3>
          <p class="warning-text">{{ t('admin.resetWarning') }}</p>
          <button class="btn btn-danger" @click="resetAllData">{{ t('admin.resetData') }}</button>
        </div>
        
        <div class="settings-section">
          <h3>{{ t('nav.admin') }}</h3>
          <button class="btn btn-primary" @click="logout">{{ t('admin.logout') }}</button>
        </div>
      </div>
    </div>

    <div class="tab-content" v-if="activeTab === 'config'">
      <!-- 仓库信息 -->
      <div class="card config-card">
        <div class="config-header">
          <h2>🗂️ {{ t('config.title') }}</h2>
          <div class="config-actions">
            <button class="btn btn-secondary" @click="loadConfigInfo" :disabled="configLoading">
              🔄 {{ t('config.refresh') }}
            </button>
            <button class="btn btn-primary" @click="handleFlushSync" :disabled="configLoading">
              ⚡ {{ t('config.flushSync') }}
            </button>
          </div>
        </div>

        <div v-if="configMessage" class="config-message" :class="'msg-' + configMessageType">
          {{ configMessage }}
        </div>

        <div v-if="configLoading && !configRepoInfo" class="empty-state">
          <p>{{ t('config.loading') }}</p>
        </div>

        <div v-else-if="configRepoInfo" class="config-repo-info">
          <h3>{{ t('config.repoInfo') }}</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">{{ t('config.appId') }}:</span>
              <span class="value">{{ configRepoInfo.appId }}</span>
            </div>
            <div class="info-item">
              <span class="label">{{ t('config.nodeId') }}:</span>
              <span class="value">{{ configRepoInfo.nodeId || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">IndexedDB Store:</span>
              <span class="value">{{ configRepoInfo.idbStoreName }}</span>
            </div>
            <div class="info-item">
              <span class="label">副本后端数量:</span>
              <span class="value">{{ configRepoInfo.replicaCount }}</span>
            </div>
            <div class="info-item">
              <span class="label">同步组类型:</span>
              <span class="value">{{ configRepoInfo.groupType || '(未设置)' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 后端拓扑 -->
      <div class="card config-card">
        <div class="config-header" style="margin-bottom: var(--space-md)">
          <h3>🔗 后端拓扑 ({{ backends.length + 1 }})</h3>
          <div class="config-actions">
            <button class="btn btn-primary btn-sm" @click="openAddBackendDialog" :disabled="configLoading">
              ➕ 添加后端
            </button>
          </div>
        </div>

        <!-- 本地 IDB 主后端 -->
        <div class="backend-item backend-primary">
          <div class="backend-icon">💾</div>
          <div class="backend-main">
            <div class="backend-title">
              <strong>local-idb</strong>
              <span class="backend-badge badge-primary">主后端</span>
              <span class="backend-type">IndexedDB (内置)</span>
            </div>
            <div class="backend-desc">浏览器本地 IndexedDB，离线优先，所有写入先持久化到这里。</div>
          </div>
          <div class="backend-actions">
            <button class="btn btn-sm btn-secondary" disabled>不可删除</button>
          </div>
        </div>

        <div v-if="backends.length === 0" class="empty-state" style="margin-top: var(--space-md)">
          <p>暂未添加副本后端。点击"添加后端"可配置 WebDAV 等远程双向同步。</p>
        </div>

        <div v-else class="backend-list">
          <div v-for="bk in backends" :key="bk.id" class="backend-item">
            <div class="backend-icon">
              {{ (getBackendMetadata(bk.type)?.icon) || '📦' }}
            </div>
            <div class="backend-main">
              <div class="backend-title">
                <strong>{{ bk.id }}</strong>
                <span class="backend-badge badge-replica">副本</span>
                <span class="backend-type">{{ bk.type }}</span>
              </div>
              <div v-if="bk.description" class="backend-desc">{{ bk.description }}</div>
              <div class="backend-options">
                <template v-for="(v, k) in bk.options" :key="k">
                  <span class="opt-k">{{ k }}:</span>
                  <span class="opt-v">{{
                    String(k).toLowerCase().includes('password') || String(k).toLowerCase().includes('token')
                      ? (v ? '••••••' : '(空)')
                      : (String(v).length > 80 ? String(v).slice(0, 80) + '…' : String(v))
                  }}</span>
                </template>
              </div>
            </div>
            <div class="backend-actions">
              <button class="btn btn-sm btn-danger" @click="handleRemoveBackend(bk.id)" :disabled="configLoading">
                ✖️ 移除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 配置项列表 -->
      <div class="card config-card">
        <h3>{{ t('config.entries') }} ({{ configEntries.length }})</h3>

        <div v-if="configEntries.length === 0" class="empty-state">
          <p>{{ t('config.noEntries') }}</p>
        </div>

        <div v-else class="config-list">
          <div v-for="entry in configEntries" :key="entry.path" class="config-item">
            <div class="config-item-header" @click="togglePath(entry.path)">
              <div class="config-item-info">
                <span class="toggle-icon">{{ expandedPaths.has(entry.path) ? '▼' : '▶' }}</span>
                <span class="config-path">{{ entry.path }}</span>
                <span class="config-size">
                  {{ entry.sizeBytes ? formatBytes(entry.sizeBytes) : getConfigSize(entry.value) }}
                </span>
              </div>
              <div class="config-item-actions" @click.stop>
                <button class="btn btn-sm btn-secondary" @click="startEdit(entry.path)">
                  ✏️ {{ t('config.edit') }}
                </button>
                <button class="btn btn-sm btn-danger" @click="deleteConfig(entry.path)">
                  🗑️ {{ t('config.delete') }}
                </button>
              </div>
            </div>

            <div v-if="expandedPaths.has(entry.path) && editingPath !== entry.path" class="config-item-value">
              <pre>{{ formatConfigValue(entry.value) }}</pre>
            </div>

            <div v-if="editingPath === entry.path" class="config-item-edit">
              <textarea
                v-model="editingValue"
                rows="8"
                class="config-edit-textarea"
                :placeholder="t('config.editPlaceholder')"
              ></textarea>
              <div class="edit-actions">
                <button class="btn btn-sm btn-primary" @click="saveEdit">
                  💾 {{ t('config.save') }}
                </button>
                <button class="btn btn-sm btn-secondary" @click="cancelEdit">
                  ✖️ {{ t('config.cancel') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 同步状态 -->
      <div class="card config-card">
        <h3>{{ t('config.syncStatus') }}</h3>

        <div v-if="syncStatuses.length === 0" class="empty-state">
          <p>{{ t('config.noSyncStatus') }}</p>
        </div>

        <div v-else class="sync-status-list">
          <div v-for="status in syncStatuses" :key="status.path" class="sync-status-item">
            <span class="sync-path">{{ status.path }}</span>
            <span class="sync-state" :class="'state-' + status.status.toLowerCase()">
              {{ status.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- 冲突列表 -->
      <div class="card config-card">
        <h3>{{ t('config.conflicts') }} ({{ conflicts.length }})</h3>

        <div v-if="conflicts.length === 0" class="empty-state">
          <p>{{ t('config.noConflicts') }}</p>
        </div>

        <div v-else class="conflict-list">
          <div
            v-for="(conflict, idx) in conflicts"
            :key="(conflict.conflictPath || 'conflict') + '-' + idx"
            class="conflict-item"
          >
            <div class="conflict-header">
              <span class="conflict-id">#{{ idx + 1 }}</span>
              <span class="conflict-path">{{ conflict.conflictPath }}</span>
              <span class="conflict-time">{{ new Date(conflict.timestamp).toLocaleString() }}</span>
            </div>
            <div class="conflict-meta">
              <span>源: {{ conflict.sourceAuthor }} (v{{ conflict.sourceVersion }})</span>
              <span>目标: {{ conflict.targetAuthor }} (v{{ conflict.targetVersion }})</span>
              <span v-if="conflict.resolvedStrategy">自动策略: {{ conflict.resolvedStrategy }}</span>
            </div>
            <div style="padding: var(--space-md)">
              <button class="btn btn-sm btn-primary" @click="openConflictViewer(conflict)">
                👁 查看并解决
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加后端对话框 -->
      <div v-if="addBackendDialog" class="modal-overlay" @click.self="addBackendDialog = false">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>➕ 添加同步后端</h3>
            <button class="btn btn-sm btn-secondary" @click="addBackendDialog = false">✖️</button>
          </div>
          <div class="modal-body">
            <div class="input-group">
              <label>后端 ID <span style="color: var(--error)">*</span></label>
              <input
                type="text"
                v-model="newBackendId"
                placeholder="例如 webdav-nextcloud（唯一标识）"
              />
            </div>
            <div class="input-group">
              <label>后端类型</label>
              <select v-model="newBackendType" @change="onBackendTypeChange">
                <option v-for="m in backendMetaList" :key="m.type" :value="m.type">
                  {{ m.icon }} {{ m.label }} ({{ m.type }})
                </option>
              </select>
            </div>
            <div class="input-group">
              <label>描述</label>
              <input type="text" v-model="newBackendDescription" placeholder="可选，例如「家里面的 NextCloud」" />
            </div>

            <div v-for="f in newBackendFormFields" :key="f.key" class="input-group">
              <label>
                {{ f.label }}
                <span v-if="f.required" style="color: var(--error)">*</span>
              </label>
              <input
                :type="f.type === 'password' ? 'password' : f.type === 'select' ? 'text' : 'text'"
                v-model="newBackendOptions[f.key]"
                :placeholder="f.placeholder || ''"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="addBackendDialog = false">取消</button>
            <button class="btn btn-primary" @click="handleAddBackend" :disabled="configLoading">
              添加后端
            </button>
          </div>
        </div>
      </div>

      <!-- 冲突查看/解决对话框 -->
      <div v-if="conflictViewer?.open" class="modal-overlay" @click.self="closeConflictViewer">
        <div class="modal-dialog modal-wide">
          <div class="modal-header">
            <h3>⚔️ 冲突处理</h3>
            <button class="btn btn-sm btn-secondary" @click="closeConflictViewer">✖️</button>
          </div>
          <div class="modal-body">
            <div class="conflict-view-grid">
              <div class="conflict-view-side">
                <h4>源端 (source)</h4>
                <pre class="conflict-view-pre">{{ conflictViewer.source || '(空)' }}</pre>
              </div>
              <div class="conflict-view-side">
                <h4>目标端 (target)</h4>
                <pre class="conflict-view-pre">{{ conflictViewer.target || '(空)' }}</pre>
              </div>
              <div v-if="conflictViewer.resolved" class="conflict-view-side">
                <h4>已自动解决 (resolved)</h4>
                <pre class="conflict-view-pre">{{ conflictViewer.resolved }}</pre>
              </div>
            </div>
            <div class="input-group" style="margin-top: var(--space-lg)">
              <label>合并结果（编辑后提交作为最终版本）</label>
              <textarea
                rows="10"
                v-model="conflictViewer.merged"
                class="config-edit-textarea"
                style="width: 100%"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeConflictViewer">取消</button>
            <button class="btn btn-primary" @click="handleResolveConflict" :disabled="configLoading">
              ✅ 以此合并结果解决
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.page-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.admin-tabs {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
}

.tab-button {
  padding: var(--space-md) var(--space-lg);
  background-color: var(--gray-100);
  color: var(--gray-800);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background-color: var(--gray-200);
  color: var(--gray-900);
}

.tab-button.active {
  background-color: var(--primary);
  color: var(--gray-900);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.form-card, .settings-card, .webdav-card {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
}

.webdav-description {
  color: var(--gray-600);
  margin-bottom: var(--space-lg);
}

.sync-message {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
  text-align: center;
}

.sync-message.idle {
  background-color: var(--gray-100);
  color: var(--gray-700);
}

.sync-message.syncing {
  background-color: var(--primary-light);
  color: var(--primary);
}

.sync-message.synced {
  background-color: #d4edda;
  color: #155724;
}

.sync-message.error {
  background-color: #f8d7da;
  color: #721c24;
}

.form-section, .sync-section {
  margin-top: var(--space-lg);
}

.form-section h3, .sync-section h3 {
  margin-bottom: var(--space-md);
  color: var(--gray-800);
}

.form-row {
  display: flex;
  gap: var(--space-md);
}

.form-row .input-group {
  flex: 1;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.icon-option {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-option:hover {
  background-color: var(--primary-light);
  transform: scale(1.1);
}

.icon-option.selected {
  background-color: var(--primary);
  transform: scale(1.1);
}

.admin-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.admin-list-item {
  display: flex;
  align-items: center;
  padding: var(--space-md);
  background-color: var(--white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 24px;
  background-color: var(--primary-light);
  border-radius: var(--radius-md);
  margin-right: var(--space-md);
}

.item-content {
  flex: 1;
}

.item-content h3 {
  margin: 0;
  margin-bottom: var(--space-xs);
}

.item-content p {
  color: var(--gray-700);
  margin: 0;
  margin-bottom: var(--space-xs);
}

.item-points, .item-requirement {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  font-weight: 600;
}

.item-time {
  font-size: var(--font-size-sm);
  color: var(--gray-500);
  margin-top: var(--space-xs);
}

.delete-btn {
  padding: var(--space-xs) var(--space-md);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  background-color: var(--gray-100);
  border-radius: var(--radius-lg);
  color: var(--gray-600);
}

.settings-section {
  margin-bottom: var(--space-lg);
}

.settings-section h3 {
  margin-bottom: var(--space-sm);
}

.warning-text {
  color: var(--error);
  font-weight: 600;
  margin-bottom: var(--space-md);
}

.button-group {
  display: flex;
  gap: var(--space-md);
  margin-top: var(--space-lg);
  flex-wrap: wrap;
}

.checkbox-group {
  margin-top: var(--space-md);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.sync-info {
  background-color: var(--gray-100);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
}

.sync-info-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-xs) 0;
}

.sync-info-item .label {
  font-weight: 600;
  color: var(--gray-700);
}

.sync-info-item .value {
  color: var(--gray-900);
}

.status-idle { color: var(--gray-600); }
.status-syncing { color: var(--primary); }
.status-synced { color: #155724; }
.status-error { color: #721c24; }

.danger-zone {
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid var(--gray-200);
}

/* zen-fs-config 配置面板样式 */
.config-card {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
  gap: var(--space-md);
}

.config-actions {
  display: flex;
  gap: var(--space-sm);
}

.config-message {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
  text-align: center;
}

.msg-info {
  background-color: var(--gray-100);
  color: var(--gray-700);
}

.msg-success {
  background-color: #d4edda;
  color: #155724;
}

.msg-error {
  background-color: #f8d7da;
  color: #721c24;
}

.config-repo-info {
  margin-top: var(--space-md);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
}

.info-item .label {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  font-weight: 600;
}

.info-item .value {
  font-size: var(--font-size-md);
  color: var(--gray-900);
  word-break: break-all;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.config-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.config-item {
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.config-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background-color: var(--gray-100);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.config-item-header:hover {
  background-color: var(--gray-200);
}

.config-item-info {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex: 1;
  min-width: 0;
}

.toggle-icon {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  width: 16px;
}

.config-path {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: var(--font-size-sm);
  color: var(--gray-900);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-size {
  font-size: var(--font-size-xs);
  color: var(--gray-500);
  background-color: var(--gray-200);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.config-item-actions {
  display: flex;
  gap: var(--space-xs);
  flex-shrink: 0;
}

.config-item-value {
  padding: var(--space-md);
  background-color: var(--white);
  border-top: 1px solid var(--gray-200);
}

.config-item-value pre {
  margin: 0;
  padding: var(--space-md);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: var(--font-size-sm);
  color: var(--gray-800);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
}

.config-item-edit {
  padding: var(--space-md);
  background-color: var(--white);
  border-top: 1px solid var(--gray-200);
}

.config-edit-textarea {
  width: 100%;
  padding: var(--space-md);
  border: 2px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: var(--font-size-sm);
  color: var(--gray-900);
  background-color: var(--white);
  resize: vertical;
  min-height: 150px;
}

.config-edit-textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.edit-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.sync-status-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.sync-status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
}

.sync-path {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: var(--font-size-sm);
  color: var(--gray-800);
}

.sync-state {
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background-color: var(--gray-200);
  color: var(--gray-700);
}

.state-synced {
  background-color: #d4edda;
  color: #155724;
}

.state-syncing {
  background-color: var(--primary-light);
  color: var(--primary-dark);
}

.state-error,
.state-conflict {
  background-color: #f8d7da;
  color: #721c24;
}

.conflict-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.conflict-item {
  border: 1px solid var(--error-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.conflict-header {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: #f8d7da;
  color: #721c24;
  font-size: var(--font-size-sm);
  flex-wrap: wrap;
}

.conflict-id {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-weight: 600;
}

.conflict-path {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  flex: 1;
}

.conflict-time {
  font-size: var(--font-size-xs);
}

.conflict-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  padding: var(--space-md);
}

.conflict-side h4 {
  margin: 0 0 var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--gray-700);
}

.conflict-side pre {
  margin: 0;
  padding: var(--space-sm);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: var(--font-size-xs);
  color: var(--gray-800);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.btn-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-xs);
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .admin-tabs {
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .button-group {
    flex-direction: column;
  }
  
  .button-group .btn {
    width: 100%;
  }

  .config-header {
    flex-direction: column;
    align-items: stretch;
  }

  .config-actions {
    flex-direction: column;
  }

  .config-item-header {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-sm);
  }

  .config-item-actions {
    justify-content: flex-end;
  }

  .conflict-content {
    grid-template-columns: 1fr;
  }

  .backend-item {
    flex-direction: column;
    align-items: stretch;
  }

  .backend-actions {
    align-self: flex-start;
  }

  .conflict-view-grid {
    grid-template-columns: 1fr;
  }

  .modal-dialog {
    max-width: 100%;
    margin: 10px;
  }

  .modal-wide {
    max-width: 100%;
  }
}

/* ========== 后端拓扑样式 ========== */
.backend-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.backend-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: var(--gray-50, #f9fafb);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
}

.backend-primary {
  background-color: #e0f2fe;
  border-color: #7dd3fc;
  margin-bottom: var(--space-md);
}

.backend-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--white);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.backend-main {
  flex: 1;
  min-width: 0;
}

.backend-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.backend-type {
  font-size: var(--font-size-xs);
  color: var(--gray-500);
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.backend-badge {
  font-size: var(--font-size-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: 600;
}

.badge-primary {
  background-color: var(--primary);
  color: var(--white);
}

.badge-replica {
  background-color: var(--gray-200);
  color: var(--gray-700);
}

.backend-desc {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  margin-top: 2px;
}

.backend-options {
  margin-top: var(--space-sm);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs) var(--space-md);
  font-size: var(--font-size-xs);
}

.backend-options .opt-k {
  color: var(--gray-500);
  font-weight: 600;
}

.backend-options .opt-v {
  color: var(--gray-700);
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.backend-actions {
  flex-shrink: 0;
}

/* ========== Modal 对话框样式 ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
}

.modal-dialog {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-wide {
  max-width: 960px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid var(--gray-200);
}

.modal-header h3 {
  margin: 0;
  color: var(--gray-800);
}

.modal-body {
  padding: var(--space-xl);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  padding: var(--space-lg) var(--space-xl);
  border-top: 1px solid var(--gray-200);
  background-color: var(--gray-50, #f9fafb);
}

/* ========== 冲突查看器样式 ========== */
.conflict-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  background-color: var(--white);
}

.conflict-view-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
}

.conflict-view-side h4 {
  margin: 0 0 var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--gray-700);
}

.conflict-view-pre {
  margin: 0;
  padding: var(--space-sm);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--font-size-xs);
  color: var(--gray-800);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--gray-200);
}

</style>
