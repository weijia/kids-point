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
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background-color: var(--gray-200);
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
}
</style>
