<script setup lang="ts">
import { computed } from 'vue'
import type { Member } from '../../stores/members'
import MemberAvatar from './MemberAvatar.vue'

const props = defineProps<{
  member: Member;
}>()

const emit = defineEmits<{
  (e: 'select', member: Member): void;
}>()

const selectMember = () => {
  emit('select', props.member)
}
</script>

<template>
  <div class="member-card" @click="selectMember">
    <div class="member-header">
      <MemberAvatar :name="member.name" :color="member.avatarColor" size="lg" />
      <h3>{{ member.name }}</h3>
    </div>
    <div class="member-points">
      <span class="points-value">{{ member.points }}</span>
      <span class="points-label">POINTS</span>
    </div>
  </div>
</template>

<style scoped>
.member-card {
  display: flex;
  flex-direction: column;
  padding: var(--space-lg);
  background-color: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.member-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.member-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-md);
}

.member-header h3 {
  margin-top: var(--space-sm);
  margin-bottom: 0;
  text-align: center;
}

.member-points {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--primary-light);
  padding: var(--space-sm);
  border-radius: var(--radius-md);
}

.points-value {
  font-size: var(--font-size-xl);
  font-weight: bold;
  color: var(--primary-dark);
}

.points-label {
  font-size: var(--font-size-xs);
  font-weight: bold;
  color: var(--gray-700);
}
</style>