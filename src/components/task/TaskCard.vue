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
  isForEveryone?: boolean;
}>()

const membersStore = inject('membersStore') as MembersStore
const tasksStore = inject('tasksStore') as TasksStore

// Debug stores injection
console.log('membersStore:', membersStore)
console.log('tasksStore:', tasksStore)
console.log('Current task:', props.task)

const showParticles = ref(false)
const selectedMemberId = ref('')
const showMemberSelector = ref(false)

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
  console.group('completeTask Debug')
  console.log('completeTask called with memberId:', memberId)
  console.log('Current task:', props.task)
  console.log('tasksStore:', tasksStore)
  console.log('membersStore:', membersStore)
  
  if (props.task.isComplete) {
    console.warn('Task already completed')
    console.groupEnd()
    return
  }
  
  try {
    console.log('Calling tasksStore.completeTask')
    const result = tasksStore.completeTask(props.task.id, memberId)
    console.log('completeTask result:', result)
    
    console.log('Adding points to member')
    const pointsResult = membersStore.addPoints(
      memberId,
      props.task.points,
      `Completed task: ${props.task.title}`,
      props.task.id
    )
    console.log('addPoints result:', pointsResult)
    
    // Show particles effect
    showParticles.value = true
    setTimeout(() => {
      showParticles.value = false
    }, 2500)
    
    console.log('Task completed successfully')
  } catch (error) {
    console.error('Error completing task:', error)
  } finally {
    console.groupEnd()
  }
}

const completeTaskForMember = () => {
  if (!selectedMemberId.value) return
  
  completeTask(selectedMemberId.value)
  showMemberSelector.value = false
  selectedMemberId.value = ''
}

const revertTask = (memberId: string) => {
  if (!memberId) return
  
  if (confirm(`确定要撤销完成此任务吗? ${props.task.points}点将被扣除。`)) {
    tasksStore.revertTaskCompletion(props.task.id, memberId)
    membersStore.removePoints(
      memberId,
      props.task.points,
      `Reverted task: ${props.task.title}`,
      props.task.id
    )
  }
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
        
        <!-- For tasks assigned to specific members -->
        <button 
          v-if="!task.isComplete && assignedMember" 
          class="btn btn-success" 
          @click="completeTask(assignedMember.id)"
        >
          Complete
        </button>
        
        <!-- For tasks assigned to everyone -->
        <div v-else-if="!task.isComplete && props.isForEveryone && task.memberId === 'everyone'" class="task-everyone-complete">
          <button 
            v-if="!showMemberSelector"
            class="btn btn-success" 
            @click="showMemberSelector = true"
          >
            Complete
          </button>
          
          <div v-else class="member-selector">
            <select 
              v-model="selectedMemberId"
              class="select-member"
            >
              <option value="" disabled>Select member</option>
              <option v-for="member in membersStore.members" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
            <button 
              @click="completeTaskForMember"
              :disabled="!selectedMemberId"
              class="btn btn-sm btn-primary"
            >
              Done
            </button>
          </div>
        </div>
        
        <div v-else-if="task.isComplete" class="task-completed">
          <span class="completed-icon">✅</span>
          <span>Completed</span>
          <button 
            class="btn btn-sm btn-outline-danger ml-2"
            @click.stop="revertTask(task.completedBy)"
          >
            Undo
          </button>
        </div>
      </div>
    </div>
    
    <MemberAvatar 
      v-if="showMember && assignedMember && assignedMember.name" 
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