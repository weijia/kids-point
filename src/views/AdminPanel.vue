<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { SettingsStore } from '../stores/settings'
import type { RewardsStore } from '../stores/rewards'
import type { AchievementsStore } from '../stores/achievements'

const settingsStore = inject('settingsStore') as SettingsStore
const rewardsStore = inject('rewardsStore') as RewardsStore
const achievementsStore = inject('achievementsStore') as AchievementsStore
const router = useRouter()

// New reward form data
const newReward = ref({
  title: '',
  description: '',
  icon: '🎁',
  points: 50
})

// New achievement form data
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

// Icon options
const rewardIconOptions = [
  '🎁', '🧸', '🎮', '🍦', '🍕', '🎬', '📱', '⌚', '🎨', '📚', '🎯', '🎪', '🏖️', '🎭', '🎠'
]

const achievementIconOptions = [
  '🏆', '🥇', '🏅', '🎖️', '⭐', '🌟', '🚀', '🔥', '💯', '👑', '💪', '🧠', '❤️', '🌈', '✨'
]

// Active tab
const activeTab = ref('rewards')

// Get all rewards
const rewards = computed(() => {
  return rewardsStore.rewards
})

// Get all achievements
const achievements = computed(() => {
  return achievementsStore.achievements
})

// Add a new reward
const addReward = () => {
  if (newReward.value.title.trim() === '') return
  
  rewardsStore.addReward({
    title: newReward.value.title.trim(),
    description: newReward.value.description.trim(),
    icon: newReward.value.icon,
    points: newReward.value.points
  })
  
  // Reset form
  newReward.value = {
    title: '',
    description: '',
    icon: '🎁',
    points: 50
  }
}

// Add a new achievement
const addAchievement = () => {
  if (newAchievement.value.title.trim() === '') return
  
  achievementsStore.addAchievement({
    title: newAchievement.value.title.trim(),
    description: newAchievement.value.description.trim(),
    icon: newAchievement.value.icon,
    requirement: { ...newAchievement.value.requirement }
  })
  
  // Reset form
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

// Delete a reward
const deleteReward = (id: string) => {
  const confirmed = confirm('Are you sure you want to delete this reward?')
  if (confirmed) {
    rewardsStore.deleteReward(id)
  }
}

// Delete an achievement
const deleteAchievement = (id: string) => {
  const confirmed = confirm('Are you sure you want to delete this achievement?')
  if (confirmed) {
    achievementsStore.deleteAchievement(id)
  }
}

// Reset all data
const resetAllData = () => {
  const confirmed = confirm(
    'WARNING: This will reset all members, tasks, rewards, and achievements. This action cannot be undone. Are you sure?'
  )
  
  if (confirmed) {
    const doubleConfirmed = confirm(
      'Are you ABSOLUTELY sure? All data will be permanently deleted.'
    )
    
    if (doubleConfirmed) {
      settingsStore.resetData()
      alert('All data has been reset successfully.')
    }
  }
}

// Logout
const logout = () => {
  settingsStore.logout()
  router.push('/admin-login')
}
</script>

<template>
  <div class="admin-panel">
    <div class="page-header">
      <h1>Admin Panel</h1>
      <p>Manage rewards, achievements, and system settings.</p>
    </div>
    
    <div class="admin-tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'rewards' }"
        @click="activeTab = 'rewards'"
      >
        🎁 Rewards
      </button>
      
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'achievements' }"
        @click="activeTab = 'achievements'"
      >
        🏆 Achievements
      </button>
      
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'settings' }"
        @click="activeTab = 'settings'"
      >
        ⚙️ Settings
      </button>
    </div>
    
    <!-- Rewards Tab -->
    <div class="tab-content" v-if="activeTab === 'rewards'">
      <div class="card form-card">
        <h2>Create New Reward</h2>
        
        <div class="form-row">
          <div class="input-group">
            <label for="reward-title">Reward Title</label>
            <input 
              type="text" 
              id="reward-title" 
              v-model="newReward.title" 
              placeholder="Enter reward title"
            />
          </div>
          
          <div class="input-group">
            <label for="reward-points">Points Cost</label>
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
          <label for="reward-description">Description</label>
          <textarea 
            id="reward-description" 
            v-model="newReward.description" 
            placeholder="Enter reward description"
            rows="2"
          ></textarea>
        </div>
        
        <div class="input-group">
          <label>Icon</label>
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
        
        <button class="btn btn-primary" @click="addReward">Create Reward</button>
      </div>
      
      <div class="rewards-list">
        <h2>Manage Rewards</h2>
        
        <div v-if="rewards.length === 0" class="empty-state">
          <p>No rewards created yet. Add your first reward above!</p>
        </div>
        
        <div v-else class="admin-list">
          <div v-for="reward in rewards" :key="reward.id" class="admin-list-item">
            <div class="item-icon">{{ reward.icon }}</div>
            <div class="item-content">
              <h3>{{ reward.title }}</h3>
              <p>{{ reward.description }}</p>
              <div class="item-points">{{ reward.points }} points</div>
            </div>
            <button class="btn btn-danger delete-btn" @click="deleteReward(reward.id)">Delete</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Achievements Tab -->
    <div class="tab-content" v-if="activeTab === 'achievements'">
      <div class="card form-card">
        <h2>Create New Achievement</h2>
        
        <div class="form-row">
          <div class="input-group">
            <label for="achievement-title">Achievement Title</label>
            <input 
              type="text" 
              id="achievement-title" 
              v-model="newAchievement.title" 
              placeholder="Enter achievement title"
            />
          </div>
          
          <div class="input-group">
            <label for="achievement-type">Requirement Type</label>
            <select id="achievement-type" v-model="newAchievement.requirement.type">
              <option value="taskCount">Task Completion Count</option>
              <option value="pointsTotal">Total Points Earned</option>
              <option value="rewardsRedeemed">Rewards Redeemed</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>
        
        <div class="input-group">
          <label for="achievement-description">Description</label>
          <textarea 
            id="achievement-description" 
            v-model="newAchievement.description" 
            placeholder="Enter achievement description"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-row">
          <div class="input-group">
            <label for="requirement-count">Required Count</label>
            <input 
              type="number" 
              id="requirement-count" 
              v-model.number="newAchievement.requirement.count" 
              min="1" 
              max="1000"
            />
          </div>
          
          <div class="input-group" v-if="newAchievement.requirement.type === 'taskType'">
            <label for="task-type">Task Type</label>
            <input 
              type="text" 
              id="task-type" 
              v-model="newAchievement.requirement.taskType" 
              placeholder="Enter task type"
            />
          </div>
        </div>
        
        <div class="input-group">
          <label>Icon</label>
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
        
        <button class="btn btn-primary" @click="addAchievement">Create Achievement</button>
      </div>
      
      <div class="achievements-list">
        <h2>Manage Achievements</h2>
        
        <div v-if="achievements.length === 0" class="empty-state">
          <p>No achievements created yet. Add your first achievement above!</p>
        </div>
        
        <div v-else class="admin-list">
          <div v-for="achievement in achievements" :key="achievement.id" class="admin-list-item">
            <div class="item-icon">{{ achievement.icon }}</div>
            <div class="item-content">
              <h3>{{ achievement.title }}</h3>
              <p>{{ achievement.description }}</p>
              <div class="item-requirement">
                Requires: {{ achievement.requirement.count }} 
                {{ achievement.requirement.type === 'taskCount' ? 'tasks completed' : 
                   achievement.requirement.type === 'pointsTotal' ? 'total points' : 
                   achievement.requirement.type === 'rewardsRedeemed' ? 'rewards redeemed' : 
                   'custom goal' }}
              </div>
            </div>
            <button class="btn btn-danger delete-btn" @click="deleteAchievement(achievement.id)">Delete</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Settings Tab -->
    <div class="tab-content" v-if="activeTab === 'settings'">
      <div class="card settings-card">
        <h2>System Settings</h2>
        
        <div class="settings-section">
          <h3>Data Management</h3>
          <p class="warning-text">Warning: The following action cannot be undone!</p>
          <button class="btn btn-danger" @click="resetAllData">Reset All Data</button>
        </div>
        
        <div class="settings-section">
          <h3>Admin Access</h3>
          <button class="btn btn-primary" @click="logout">Logout</button>
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

.form-card, .settings-card {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
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

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .admin-tabs {
    flex-direction: column;
    gap: var(--space-xs);
  }
}
</style>