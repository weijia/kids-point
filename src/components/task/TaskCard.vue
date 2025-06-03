<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import type { Task } from '../../stores/tasks'
import type { MembersStore } from '../../stores/members'
import type { TasksStore } from '../../stores/tasks'
import MemberAvatar from '../member/MemberAvatar.vue'
import PointsParticles from '../particles/PointsParticles.vue'

const props = defineProps<{
  task: Task;
  showMember?: boolean;
}>()

const membersStore = inject('membersStore') as MembersStore
const tasksStore = inject('tasksStore') as TasksStore

const showParticles = ref(false)

const assignedMember = computed(() => {
  if (props.task.memberId) {
    return membersStore.getMemberById(props.task.memberId)
  }
  return null
})

const frequencyBadge = computed(() => {
  switch (props.task.frequency) {
    case 'daily': return { label: 'Daily', class: 'badge-primary' };
    case 'weekly': return { label: 'Weekly', class: 'badge-warning' };
    default: return { label: 'Once', class: 'badge-success' };
  }
})

const completeTask = (memberId: string) => {
  if (props.task.isComplete) return
  
  tasksStore.completeTask(props.task.id, memberId)
  
  // Add points to the member
  membersStore.addPoints(
    memberId,
    props.task.points,
    `Completed task: ${props.task.title}`,
    props.task.id
  )
  
  // Show particles effect
  showParticles.value = true
  setTimeout(() => {
    showParticles.value = false
  }, 2500)
}
</script>

<template>
  <div class="task-card" :class="{ 'is-complete': task.isComplete }">
    <div class="task-icon">{{ task.icon }}</div>
    
    <div class="task-content">
      <div class="task-header">
        <h4>{{ task.title }}</h4>
        <span class="badge" :class="frequencyBadge.class">{{ frequencyBadge.label }}</span>
      </div>
      
      <p class="task-description">{{ task.description }}</p>
      
      <div class="task-footer">
        <div class="task-points">
          <span class="points-value">{{ task.points }}</span>
          <span class="points-label">pts</span>
        </div>
        
        <button 
          v-if="!task.isComplete && assignedMember" 
          class="btn btn-success" 
          @click="completeTask(assignedMember.id)"
        >
          Complete
        </button>
        
        <div v-else-if="task.isComplete" class="task-completed">
          <span class="completed-icon">✅</span>
          <span>Completed</span>
        </div>
      </div>
    </div>
    
    <MemberAvatar 
      v-if="showMember && assignedMember" 
      :name="assignedMember.name" 
      :color="assignedMember.avatarColor" 
      size="sm"
      class="assigned-member"
    />
    
    <PointsParticles :active="showParticles" color="#FFD700" />
  </div>
</template>

<style scoped>
.task-card {
  display: flex;
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-md);
  box-shadow: var(--shadow-md);
  position: relative;
  transition: all 0.2s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.task-card.is-complete {
  opacity: 0.7;
  background-color: var(--gray-100);
}

.task-icon {
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

.task-content {
  flex: 1;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-xs);
}

.task-header h4 {
  margin: 0;
}

.task-description {
  margin-bottom: var(--space-sm);
  color: var(--gray-700);
  font-size: var(--font-size-sm);
}

.task-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-points {
  display: flex;
  align-items: baseline;
}

.points-value {
  font-size: var(--font-size-lg);
  font-weight: bold;
  color: var(--primary-dark);
  margin-right: var(--space-xs);
}

.points-label {
  font-size: var(--font-size-xs);
  color: var(--gray-600);
}

.task-completed {
  display: flex;
  align-items: center;
  color: var(--success);
  font-weight: 600;
}

.completed-icon {
  margin-right: var(--space-xs);
}

.assigned-member {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
}
</style>