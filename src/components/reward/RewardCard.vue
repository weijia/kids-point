<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import type { Reward } from '../../stores/rewards'
import type { MembersStore } from '../../stores/members'
import type { RewardsStore } from '../../stores/rewards'

const props = defineProps<{
  reward: Reward;
  memberId: string;
}>()

const emit = defineEmits<{
  (e: 'redeemed', reward: Reward): void;
}>()

const membersStore = inject('membersStore') as MembersStore
const rewardsStore = inject('rewardsStore') as RewardsStore

const isRedeeming = ref(false)
const redeemError = ref('')

const member = computed(() => {
  return membersStore.getMemberById(props.memberId)
})

const canAfford = computed(() => {
  if (!member.value) return false
  return member.value.points >= props.reward.points
})

const pointsNeeded = computed(() => {
  if (!member.value) return props.reward.points
  return Math.max(0, props.reward.points - member.value.points)
})

const redeemReward = () => {
  if (!member.value || !canAfford.value) {
    redeemError.value = 'Not enough points!'
    setTimeout(() => {
      redeemError.value = ''
    }, 3000)
    return
  }
  
  isRedeeming.value = true
  
  try {
    // Redeem the reward
    const success = rewardsStore.redeemReward(props.reward.id, props.memberId)
    
    if (success) {
      // Deduct points from the member
      membersStore.removePoints(
        props.memberId,
        props.reward.points,
        `Redeemed reward: ${props.reward.title}`,
        props.reward.id
      )
      
      emit('redeemed', props.reward)
    }
  } catch (error) {
    console.error('Failed to redeem reward:', error)
    redeemError.value = 'Failed to redeem reward!'
    setTimeout(() => {
      redeemError.value = ''
    }, 3000)
  } finally {
    isRedeeming.value = false
  }
}
</script>

<template>
  <div class="reward-card">
    <div class="reward-icon">{{ reward.icon }}</div>
    
    <div class="reward-content">
      <h4>{{ reward.title }}</h4>
      <p>{{ reward.description }}</p>
      
      <div class="reward-footer">
        <div class="reward-points">
          <span class="points-value">{{ reward.points }}</span>
          <span class="points-label">POINTS</span>
        </div>
        
        <button 
          class="btn" 
          :class="canAfford ? 'btn-success' : 'btn-disabled'"
          :disabled="!canAfford || isRedeeming"
          @click="redeemReward"
        >
          <span v-if="isRedeeming">Redeeming...</span>
          <span v-else-if="canAfford">Redeem</span>
          <span v-else>Need {{ pointsNeeded }} more</span>
        </button>
      </div>
      
      <div class="error-message" v-if="redeemError">
        {{ redeemError }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.reward-card {
  display: flex;
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  box-shadow: var(--shadow-md);
  transition: all 0.2s ease;
}

.reward-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.reward-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  font-size: 32px;
  background-color: var(--primary-light);
  border-radius: var(--radius-md);
  margin-right: var(--space-md);
}

.reward-content {
  flex: 1;
}

.reward-content h4 {
  margin-top: 0;
  margin-bottom: var(--space-xs);
}

.reward-content p {
  color: var(--gray-700);
  margin-bottom: var(--space-md);
  font-size: var(--font-size-sm);
}

.reward-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reward-points {
  display: flex;
  flex-direction: column;
}

.points-value {
  font-size: var(--font-size-lg);
  font-weight: bold;
  color: var(--primary-dark);
}

.points-label {
  font-size: var(--font-size-xs);
  color: var(--gray-600);
}

.btn-disabled {
  background-color: var(--gray-400);
  color: var(--gray-600);
  cursor: not-allowed;
}

.error-message {
  color: var(--error);
  font-size: var(--font-size-sm);
  margin-top: var(--space-sm);
}
</style>