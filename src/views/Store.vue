<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import type { RewardsStore, Reward } from '../stores/rewards'
import type { MembersStore, Member } from '../stores/members'
import RewardCard from '../components/reward/RewardCard.vue'
import MemberAvatar from '../components/member/MemberAvatar.vue'

const rewardsStore = inject('rewardsStore') as RewardsStore
const membersStore = inject('membersStore') as MembersStore

// Selected member for the store
const selectedMemberId = ref('')

// New reward form data (for admin only)
const newReward = ref({
  title: '',
  description: '',
  icon: '🎁',
  points: 50
})

// Reward being edited
const editingReward = ref<Reward | null>(null)

// Icon options
const iconOptions = [
  '🎁', '🧸', '🎮', '🍦', '🍕', '🎬', '📱', '⌚', '🎨', '📚', '🎯', '🎪', '🏖️', '🎭', '🎠'
]

// Get all members
const members = computed(() => {
  return membersStore.members
})

// Get the selected member
const selectedMember = computed(() => {
  if (!selectedMemberId.value && members.value.length > 0) {
    selectedMemberId.value = members.value[0].id
  }
  return membersStore.getMemberById(selectedMemberId.value)
})

// Get all rewards
const rewards = computed(() => {
  return rewardsStore.rewards
})

// Get redemption history for selected member
const redemptionHistory = computed(() => {
  if (!selectedMember.value) return []
  return rewardsStore.getRedemptionsByMember(selectedMember.value.id)
})

// Handle reward redemption
const onRewardRedeemed = (reward: Reward) => {
  // Show a success message
  alert(`Congratulations! You've redeemed "${reward.title}" for ${reward.points} points!`)
}

// Add a new reward (admin only)
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

// Format date
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="store-page">
    <div class="page-header">
      <h1>Rewards Store</h1>
      <p>Redeem your hard-earned points for exciting rewards!</p>
    </div>
    
    <!-- Member Selector -->
    <div v-if="members.length > 0" class="member-selector">
      <label for="member-select">Shopping as:</label>
      <select id="member-select" v-model="selectedMemberId">
        <option v-for="member in members" :key="member.id" :value="member.id">
          {{ member.name }} ({{ member.points }} points)
        </option>
      </select>
    </div>
    
    <div v-if="members.length === 0" class="empty-state">
      <p>No family members added yet. Add members before visiting the store!</p>
    </div>
    
    <div v-else-if="!selectedMember" class="empty-state">
      <p>Please select a family member to browse the store.</p>
    </div>
    
    <div v-else class="store-content">
      <!-- Member Info -->
      <div class="member-info-card">
        <div class="member-info-header">
          <MemberAvatar 
            :name="selectedMember.name" 
            :color="selectedMember.avatarColor" 
            size="lg" 
          />
          <h2>{{ selectedMember.name }}</h2>
        </div>
        
        <div class="member-points">
          <span class="points-value">{{ selectedMember.points }}</span>
          <span class="points-label">Available Points</span>
        </div>
      </div>
      
      <!-- Rewards Section -->
      <div class="rewards-section">
        <h2>Available Rewards</h2>
        
        <div v-if="rewards.length === 0" class="empty-state">
          <p>No rewards available yet. Check back soon!</p>
        </div>
        
        <div v-else class="rewards-grid">
          <RewardCard 
            v-for="reward in rewards" 
            :key="reward.id" 
            :reward="reward"
            :memberId="selectedMember.id"
            @redeemed="onRewardRedeemed"
          />
        </div>
      </div>
      
      <!-- Redemption History -->
      <div class="history-section">
        <h2>Redemption History</h2>
        
        <div v-if="redemptionHistory.length === 0" class="empty-state">
          <p>No rewards redeemed yet. Use your points to get something special!</p>
        </div>
        
        <div v-else class="history-list">
          <div v-for="(item, index) in redemptionHistory" :key="index" class="history-item">
            <div class="history-icon">{{ item.reward.icon }}</div>
            <div class="history-content">
              <h4>{{ item.reward.title }}</h4>
              <p class="history-date">Redeemed on {{ formatDate(item.date) }}</p>
            </div>
            <div class="history-points">
              <span>{{ item.reward.points }}</span>
              <small>points</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.store-page {
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

.store-content {
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

.member-points {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--primary-light);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  min-width: 200px;
}

.points-value {
  font-size: var(--font-size-xxl);
  font-weight: bold;
  color: var(--primary-dark);
}

.points-label {
  font-size: var(--font-size-sm);
  color: var(--gray-700);
}

.rewards-section, .history-section {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
}

.rewards-section h2, .history-section h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-lg);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.history-item {
  display: flex;
  align-items: center;
  padding: var(--space-md);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
}

.history-icon {
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

.history-content {
  flex: 1;
}

.history-content h4 {
  margin: 0;
  margin-bottom: var(--space-xs);
}

.history-date {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  margin: 0;
}

.history-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.history-points span {
  font-size: var(--font-size-lg);
  font-weight: bold;
  color: var(--primary-dark);
}

.history-points small {
  font-size: var(--font-size-xs);
  color: var(--gray-600);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  background-color: var(--gray-100);
  border-radius: var(--radius-lg);
  color: var(--gray-600);
}

@media (max-width: 768px) {
  .rewards-grid {
    grid-template-columns: 1fr;
  }
}
</style>