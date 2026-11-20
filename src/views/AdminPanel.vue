<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { SyncGroupConfiguratorCore, type CoreEventMap } from 'zen-fs-config-ui'
import type { AppDataGroup } from 'zen-fs-config'
import { useRewards } from '../stores/rewards'
import { useAchievements } from '../stores/achievements'
import { useViolations } from '../stores/violations'
import { useMembers } from '../stores/members'
import { useSettings } from '../stores/settings'
import { databaseService, type SyncStatus } from '../services/database'
import { registerSyncBackends, resolveDataGroup, APP_ID } from '../services/config'

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

const addReward = () => {
  if (newReward.value.title.trim() === '') return
  rewardsStore.addReward({
    title: newReward.value.title.trim(),
    description: newReward.value.description,
    icon: newReward.value.icon,
    points: newReward.value.points
  })
  newReward.value = { title: '', description: '', icon: '🎁', points: 50 }
}

const addAchievement = () => {
  if (newAchievement.value.title.trim() === '') return
  achievementsStore.addAchievement({
    title: newAchievement.value.title.trim(),
    description: newAchievement.value.description,
    icon: newAchievement.value.icon,
    requirement: { ...newAchievement.value.requirement }
  })
  newAchievement.value = {
    title: '', description: '', icon: '🏆',
    requirement: { type: 'taskCount', count: 5, taskType: '' }
  }
}

const deleteReward = (id: string) => {
  if (confirm(t('admin.confirmDelete'))) rewardsStore.deleteReward(id)
}

const deleteAchievement = (id: string) => {
  if (confirm(t('admin.confirmDelete'))) achievementsStore.deleteAchievement(id)
}

const addViolationRuleHandler = () => {
  if (newViolationRule.value.title.trim() === '') return
  violationsStore.addViolationRule({
    title: newViolationRule.value.title.trim(),
    description: newViolationRule.value.description,
    icon: newViolationRule.value.icon,
    pointsDeducted: newViolationRule.value.pointsDeducted
  })
  newViolationRule.value = { title: '', description: '', icon: '⚠️', pointsDeducted: 5 }
}

const recordViolationHandler = () => {
  if (newViolation.value.memberId === '' || newViolation.value.ruleId === '') return
  const rule = violationsStore.getViolationRule(newViolation.value.ruleId)
  if (!rule) return
  violationsStore.recordViolation(newViolation.value.ruleId, newViolation.value.memberId, newViolation.value.note.trim())
  membersStore.deductPoints(newViolation.value.memberId, rule.pointsDeducted)
  newViolation.value = { memberId: '', ruleId: '', note: '' }
}

const deleteViolationRule = (id: string) => {
  if (confirm(t('admin.confirmDelete'))) violationsStore.deleteViolationRule(id)
}

const deleteViolationRecord = (id: string) => {
  if (confirm(t('admin.confirmDelete'))) violationsStore.deleteViolationRecord(id)
}

const getMemberName = (memberId: string) => membersStore.members.value.find(m => m.id === memberId)?.name || '-'
const getRuleTitle = (ruleId: string) => violationsStore.getViolationRule(ruleId)?.title || '-'
const getRuleIcon = (ruleId: string) => violationsStore.getViolationRule(ruleId)?.icon || '⚠️'
const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString()

const resetAllData = async () => {
  const confirmed = confirm(t('admin.resetWarning') + '\n' + t('admin.resetConfirm'))
  if (confirmed) {
    await settingsStore.resetData()
    alert(t('common.success'))
  }
}

const logout = () => {
  settingsStore.logout()
  router.push('/admin-login')
}

// ---- 同步配置面板（zen-fs-config-ui）----
const configuratorHost = ref<HTMLDivElement | null>(null)
let core: SyncGroupConfiguratorCore | null = null
const syncReady = ref(false)
const syncMessage = ref('')
const syncStatus = ref<SyncStatus>('idle')

const showSyncMessage = (msg: string) => {
  syncMessage.value = msg
  setTimeout(() => {
    if (syncMessage.value === msg) syncMessage.value = ''
  }, 4000)
}

const connectDataGroup = async (connected: CoreEventMap['connected']) => {
  try {
    const group = await resolveDataGroup(connected)
    if (!group) {
      syncReady.value = false
      showSyncMessage(t('sync.noDataGroup'))
      return
    }
    await databaseService.attachDataGroup(group as AppDataGroup, true)
    syncReady.value = true
    showSyncMessage(t('sync.connected'))
  } catch (e) {
    syncReady.value = false
    showSyncMessage(t('sync.connectFailed') + ': ' + (e as Error).message)
  }
}

const handleSyncNow = async () => {
  if (!databaseService.isDataGroupReady()) {
    showSyncMessage(t('sync.notConnected'))
    return
  }
  const ok = await databaseService.syncNow()
  showSyncMessage(ok ? t('sync.success') : t('sync.failed'))
}

const initSyncPanel = () => {
  if (core || !configuratorHost.value) return
  registerSyncBackends()
  core = new SyncGroupConfiguratorCore(configuratorHost.value, { appId: APP_ID })
  core.on('connected', (data) => { void connectDataGroup(data) })
  core.on('data-group-created', (data) => {
    void connectDataGroup({ groupType: 'data-sync', dataGroup: data.dataGroup })
  })
  core.on('error', ({ message }) => showSyncMessage(t('sync.configError') + ': ' + message))
  void core.mount()
}

onMounted(() => {
  databaseService.onStatusChange((status) => { syncStatus.value = status })
  if (activeTab.value === 'sync') initSyncPanel()
})

onBeforeUnmount(() => {
  core?.destroy()
  core = null
})

const switchTab = (tab: string) => {
  activeTab.value = tab
  if (tab === 'sync') initSyncPanel()
}
</script>

<template>
  <div class="admin-panel">
    <div class="page-header">
      <h1>{{ t('admin.title') }}</h1>
    </div>

    <div class="admin-tabs">
      <button class="tab-button" :class="{ active: activeTab === 'rewards' }" @click="switchTab('rewards')">
        🎁 {{ t('admin.rewards') }}
      </button>
      <button class="tab-button" :class="{ active: activeTab === 'achievements' }" @click="switchTab('achievements')">
        🏆 {{ t('admin.achievements') }}
      </button>
      <button class="tab-button" :class="{ active: activeTab === 'violations' }" @click="switchTab('violations')">
        ⚠️ {{ t('violations.title') }}
      </button>
      <button class="tab-button" :class="{ active: activeTab === 'sync' }" @click="switchTab('sync')">
        ☁️ {{ t('sync.title') }}
      </button>
      <button class="tab-button" :class="{ active: activeTab === 'settings' }" @click="switchTab('settings')">
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

    <div class="tab-content" v-if="activeTab === 'sync'">
      <div class="card sync-card">
        <h2>☁️ {{ t('sync.title') }}</h2>
        <p class="sync-description">{{ t('sync.description') }}</p>
        <div v-if="syncMessage" class="sync-message">{{ syncMessage }}</div>
        <div class="sync-info">
          <span class="label">{{ t('sync.status') }}:</span>
          <span class="value" :class="'status-' + syncStatus">
            {{ syncStatus === 'idle' ? t('sync.idle') : syncStatus === 'syncing' ? t('sync.syncing') : syncStatus === 'synced' ? t('sync.synced') : t('sync.error') }}
          </span>
          <span class="label">{{ t('sync.dataGroup') }}:</span>
          <span class="value">{{ syncReady ? t('sync.connected') : t('sync.notConnected') }}</span>
        </div>
        <div class="button-group">
          <button class="btn btn-primary" @click="handleSyncNow" :disabled="!syncReady || syncStatus === 'syncing'">
            🔄 {{ t('sync.syncNow') }}
          </button>
        </div>
        <div ref="configuratorHost" class="sync-configurator"></div>
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
  gap: var(--space-md);
  padding: var(--space-md);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
}

.sync-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.sync-pair {
  font-size: var(--font-size-xs);
  color: var(--gray-600);
}

.sync-meta {
  font-size: var(--font-size-xs);
  color: var(--gray-500);
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

.state-syncing,
.state-watching {
  background-color: var(--primary-light);
  color: var(--primary-dark);
}

.state-error,
.state-conflict {
  background-color: #f8d7da;
  color: #721c24;
}

.state-idle,
.state-paused {
  background-color: var(--gray-200);
  color: var(--gray-700);
}

.state-disposed {
  background-color: #e2e3e5;
  color: #6c757d;
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

/* ---------- 粘贴 JSON 导入（字符串形式的配置导入/导出） ---------- */
.paste-json-box {
  border: 1px dashed var(--gray-300);
  border-radius: var(--radius-md);
  padding: var(--space-md) var(--space-lg);
  margin-bottom: var(--space-lg);
  background-color: var(--gray-50, #f9fafb);
}
.paste-json-box[open] {
  background-color: var(--white);
  border-style: solid;
  border-color: var(--primary-200, #bfdbfe);
}
.paste-json-summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--gray-800);
  padding: var(--space-xs) 0;
  user-select: none;
}
.paste-json-summary:hover {
  color: var(--primary-700, #1d4ed8);
}
.paste-json-textarea {
  width: 100%;
  min-height: 120px;
  resize: vertical;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--gray-800);
  background-color: var(--white);
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.paste-json-textarea::placeholder {
  color: var(--gray-400);
  opacity: 1;
}
.paste-json-textarea:focus {
  outline: none;
  border-color: var(--primary-500, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.paste-json-hint {
  margin: 0 0 var(--space-sm);
  font-size: var(--font-size-xs);
  color: var(--gray-600);
  line-height: 1.6;
}
.paste-json-hint code {
  background-color: var(--gray-100);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  color: var(--gray-800);
}
.paste-json-actions {
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  margin-top: var(--space-xs);
}
.inline-error {
  padding: var(--space-xs) var(--space-sm);
  margin: var(--space-xs) 0 var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--error, #b91c1c);
  background-color: var(--error-50, #fef2f2);
  border-left: 3px solid var(--error, #ef4444);
  border-radius: var(--radius-sm);
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

