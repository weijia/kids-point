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

// Debug stores injection only in development mode
if (process.env.NODE_ENV !== 'production') {
  console.log('membersStore:', membersStore)
  console.log('tasksStore:', tasksStore)
  console.log('Current task:', props.task)
}

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

const completeTask = (memberId?: string) => {
  // Use passed memberId or current member's ID
  const effectiveMemberId = memberId || membersStore.currentMember?.id
  
  // Validate member ID
  if (!effectiveMemberId) {
    console.error('No member selected - neither passed nor current')
    return
  }
  
  // Prevent completing already completed tasks
  if (props.task.isComplete) {
    console.warn('Task already completed')
    return
  }
  
  // Debug info - only in development
  if (process.env.NODE_ENV !== 'production') {
    console.group('completeTask Debug')
    console.log('completeTask called with memberId:', effectiveMemberId)
    console.log('Current task:', props.task)
  }
  
  try {
    // Complete the task in the store
    const result = tasksStore.completeTask(props.task.id, effectiveMemberId)
    
    // Add points to the member
    const pointsResult = membersStore.addPoints(
      effectiveMemberId,
      props.task.points,
      `Completed task: ${props.task.title}`,
      props.task.id
    )
    
    // Show particles effect
    showParticles.value = true
    setTimeout(() => {
      showParticles.value = false
    }, 2500)
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('Task completed successfully')
    }
  } catch (error) {
    console.error('Error completing task:', error)
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      console.groupEnd()
    }
  }
}

const completeTaskForMember = () => {
  if (!selectedMemberId.value) {
    console.error('No member selected in selector')
    return
  }
  
  const memberId = selectedMemberId.value
  completeTask(memberId)
  showMemberSelector.value = false
  
  console.log('Task completed for member:', memberId)
  selectedMemberId.value = ''
}

const revertTask = (memberId: string) => {
  if (!memberId) {
    console.error('Cannot revert task: No member ID provided')
    return
  }
  
  if (confirm(`确定要撤销完成此任务吗? ${props.task.points}点将被扣除。`)) {
    try {
      tasksStore.revertTaskCompletion(props.task.id, memberId)
      membersStore.removePoints(
        memberId,
        props.task.points,
        `Reverted task: ${props.task.title}`,
        props.task.id
      )
      console.log('Task reverted successfully')
    } catch (error) {
      console.error('Error reverting task:', error)
    }
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
        <div v-else-if="!task.isComplete && (props.isForEveryone || task.memberId === 'everyone')" class="task-everyone-complete">
          <div v-if="!showMemberSelector" class="task-buttons">
            <button 
              class="btn btn-success" 
              @click="showMemberSelector = true"
            >
              Complete
            </button>
            <button 
              v-if="membersStore.currentMember"
              class="btn btn-primary" 
              @click="completeTask(membersStore.currentMember.id)"
              title="由当前用户完成"
            >
              由{{ membersStore.currentMember.name }}完成
            </button>
          </div>
          
          <div v-else class="member-selector">
            <select 
              v-model="selectedMemberId"
              class="select-member"
            >
              <option value="" disabled>Select member</option>
              <option v-for="member in membersStore.getMembersRefs()" :key="member.value.id" :value="member.value.id">
                {{ member.value.name }}
              </option>
            </select>
            <div class="member-selector-actions">
              <button 
                @click="completeTaskForMember"
                :disabled="!selectedMemberId"
                class="btn btn-sm btn-primary"
              >
                Done
              </button>
              <button 
                @click="showMemberSelector = false; selectedMemberId = ''"
                class="btn btn-sm btn-outline-secondary"
              >
                Cancel
              </button>
            </div>
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

.member-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.member-selector-actions {
  display: flex;
  gap: var(--space-xs);
}

.select-member {
  padding: var(--space-xs);
  border-radius: var(--radius-sm);
  border: 1px solid var(--gray-300);
  width: 100%;
}

.task-buttons {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}
</style>