<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAchievements } from '../stores/achievements'
import { useMembers } from '../stores/members'
import AchievementBadge from '../components/achievement/AchievementBadge.vue'
import MemberAvatar from '../components/member/MemberAvatar.vue'

const { t } = useI18n()
const achievementsStore = useAchievements()
const membersStore = useMembers()

const selectedMemberId = ref('')

const members = computed(() => {
  return membersStore.members.value
})

const selectedMember = computed(() => {
  if (!selectedMemberId.value && members.value.length > 0) {
    selectedMemberId.value = members.value[0]?.id || ''
  }
  return members.value.find(m => m.id === selectedMemberId.value)
})

const allAchievements = computed(() => {
  return achievementsStore.achievements.value
})

const earnedAchievements = computed(() => {
  if (!selectedMember.value) return []
  return selectedMember.value.completedTasks
})

const isAchievementEarned = (achievementId: string): boolean => {
  if (!selectedMember.value) return false
  return selectedMember.value.completedTasks.includes(achievementId)
}

const getAchievementEarnDate = (_achievementId: string): number | null => {
  return null
}
</script>

<template>
  <div class="achievements-page">
    <div class="page-header">
      <h1>{{ t('achievements.title') }}</h1>
      <p>{{ t('achievements.description') }}</p>
    </div>
    
    <!-- Member Selector -->
    <div v-if="members.length > 0" class="member-selector">
      <label for="member-select">{{ t('achievements.viewFor') }}:</label>
      <select id="member-select" v-model="selectedMemberId">
        <option v-for="member in members" :key="member.id" :value="member.id">
          {{ member.name }}
        </option>
      </select>
    </div>
    
    <div v-if="members.length === 0" class="empty-state">
      <p>{{ t('achievements.noMembers') }}</p>
    </div>
    
    <div v-else-if="!selectedMember" class="empty-state">
      <p>{{ t('achievements.selectMember') }}</p>
    </div>
    
    <div v-else class="achievements-content">
      <!-- Member Info -->
      <div class="member-info-card">
        <div class="member-info-header">
          <MemberAvatar 
            :name="selectedMember.name" 
            :color="selectedMember.color" 
            size="lg" 
          />
          <h2>{{ selectedMember.name }}'s {{ t('achievements.achievements') }}</h2>
        </div>
        
        <div class="achievement-stats">
          <div class="stat stat-progress">
            <span class="stat-value">{{ allAchievements.length > 0 ? Math.round(earnedAchievements.length / allAchievements.length * 100) : 0 }}%</span>
            <span class="stat-label">{{ t('achievements.progress') }}</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ earnedAchievements.length }}</span>
            <span class="stat-label">{{ t('achievements.earned') }}</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ allAchievements.length - earnedAchievements.length }}</span>
            <span class="stat-label">{{ t('achievements.remaining') }}</span>
          </div>
        </div>
      </div>
      
      <!-- Achievements Section -->
      <div class="achievements-section">
        <h2>{{ t('achievements.achievementBadges') }}</h2>
        
        <div v-if="allAchievements.length === 0" class="empty-state">
          <p>{{ t('achievements.noAchievements') }}</p>
        </div>
        
        <div v-else class="achievements-grid">
          <AchievementBadge 
            v-for="achievement in allAchievements" 
            :key="achievement.id" 
            :achievement="achievement"
            :earned="isAchievementEarned(achievement.id)"
            :date="getAchievementEarnDate(achievement.id) || undefined"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.achievements-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.page-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.member-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.member-selector select {
  min-width: 200px;
}

.achievements-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.member-info-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-lg);
  background-color: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.member-info-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-md);
}

.member-info-header h2 {
  margin-top: var(--space-sm);
  margin-bottom: 0;
}

.achievement-stats {
  display: flex;
  gap: var(--space-xl);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--primary-light);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  min-width: 100px;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: bold;
  color: var(--primary-dark);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--gray-700);
}

.achievements-section {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
}

.achievements-section h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-lg);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  background-color: var(--gray-100);
  border-radius: var(--radius-lg);
  color: var(--gray-600);
}

@media (max-width: 768px) {
  .achievements-grid {
    grid-template-columns: 1fr;
  }
  
  .achievement-stats {
    flex-direction: column;
    gap: var(--space-md);
  }
}
</style>