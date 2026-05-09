<script setup lang="ts">
import { ref, unref, inject, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AchievementsStore } from '../stores/achievements'
import type { MembersStore } from '../stores/members'
import AchievementBadge from '../components/achievement/AchievementBadge.vue'
import MemberAvatar from '../components/member/MemberAvatar.vue'

const { t } = useI18n()
const achievementsStore = inject('achievementsStore') as AchievementsStore
const membersStore = inject('membersStore') as MembersStore

// Selected member for achievements
const selectedMemberId = ref('')

// Get all members
const members = computed(() => {
  return membersStore.members
})

// Get the selected member
const selectedMember = computed(() => {
  const membersList = unref(members).value
  if (!selectedMemberId.value && membersList && membersList.length > 0) {
    selectedMemberId.value = membersList[0]?.id || ''
  }
  return membersStore.getMemberById(selectedMemberId.value)
})

// Get all achievements
const allAchievements = computed(() => {
  return achievementsStore.achievements
})

// Get earned achievements for selected member
const earnedAchievements = computed(() => {
  if (!selectedMember.value) return []
  return achievementsStore.getMemberAchievements(selectedMember.value.id)
})

// Check which achievements are earned
const isAchievementEarned = (achievementId: string): boolean => {
  if (!selectedMember.value) return false
  
  return unref(earnedAchievements).some(
    (item: { achievement: { id: string }; date: number }) => item.achievement.id === achievementId
  )
}

// Get achievement earn date
const getAchievementEarnDate = (achievementId: string): number | null => {
  if (!selectedMember.value) return null
  
  const earned = unref(earnedAchievements).find(
    (item: { achievement: { id: string }; date: number }) => item.achievement.id === achievementId
  )
  
  return earned ? earned.date : null
}
</script>

<template>
  <div class="achievements-page">
    <div class="page-header">
      <h1>{{ t('achievements.title') }}</h1>
      <p>{{ t('achievements.description') }}</p>
    </div>
    
    <!-- Member Selector -->
    <div v-if="unref(members).length > 0" class="member-selector">
      <label for="member-select">{{ t('achievements.viewFor') }}:</label>
      <select id="member-select" v-model="selectedMemberId">
        <option v-for="member in unref(members)" :key="member.id" :value="member.id">
          {{ member.name }}
        </option>
      </select>
    </div>
    
    <div v-if="unref(members).length === 0" class="empty-state">
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
            :color="selectedMember.avatarColor" 
            size="lg" 
          />
          <h2>{{ selectedMember.name }}'s {{ t('achievements.achievements') }}</h2>
        </div>
        
        <div class="achievement-stats">
          <div class="stat">
            <span class="stat-value">{{ unref(earnedAchievements).length }}</span>
            <span class="stat-label">{{ t('achievements.earned') }}</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ unref(allAchievements).length - unref(earnedAchievements).length }}</span>
            <span class="stat-label">{{ t('achievements.remaining') }}</span>
          </div>
        </div>
      </div>
      
      <!-- Achievements Section -->
      <div class="achievements-section">
        <h2>{{ t('achievements.achievementBadges') }}</h2>
        
        <div v-if="unref(allAchievements).length === 0" class="empty-state">
          <p>{{ t('achievements.noAchievements') }}</p>
        </div>
        
        <div v-else class="achievements-grid">
          <AchievementBadge 
            v-for="achievement in unref(allAchievements)" 
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