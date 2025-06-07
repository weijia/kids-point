<script setup lang="ts">
import { computed } from 'vue'
import type { Achievement } from '../../stores/achievements'

const props = defineProps<{
  achievement: Achievement;
  earned?: boolean;
  date?: number;
}>()

const formattedDate = computed(() => {
  if (!props.date) return ''
  
  return new Date(props.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})
</script>

<template>
  <div class="achievement-badge" :class="{ 'is-earned': earned }">
    <div class="badge-icon">{{ achievement.icon }}</div>
    <div class="badge-content">
      <h4>{{ achievement.title }}</h4>
      <p>{{ achievement.description }}</p>
      <div v-if="earned && date" class="earned-date">
        Earned on {{ formattedDate }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.achievement-badge {
  display: flex;
  background-color: var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  transition: all 0.3s ease;
  opacity: 0.6;
  box-shadow: var(--shadow-sm);
}

.achievement-badge.is-earned {
  background-color: var(--white);
  opacity: 1;
  box-shadow: var(--shadow-md);
}

.achievement-badge.is-earned:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.badge-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  font-size: 32px;
  background-color: var(--primary-light);
  border-radius: 50%;
  margin-right: var(--space-md);
}

.badge-content {
  flex: 1;
}

.badge-content h4 {
  margin-top: 0;
  margin-bottom: var(--space-xs);
}

.badge-content p {
  color: var(--gray-700);
  margin-bottom: var(--space-sm);
  font-size: var(--font-size-sm);
}

.earned-date {
  font-size: var(--font-size-xs);
  color: var(--success);
  font-weight: 600;
}
</style>