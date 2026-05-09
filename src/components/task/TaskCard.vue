<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Task } from '../../stores/tasks'
import { useMembers } from '../../stores/members'
import MemberAvatar from '../member/MemberAvatar.vue'
import PointsParticles from '../particles/PointsParticles.vue'

const props = defineProps<{
  task: Task;
  showMember?: boolean;
  isForEveryone?: boolean;
}>()

const membersStore = useMembers()

const showParticles = ref(false)
const selectedMemberId = ref('')
const showMemberSelector = ref(false)

const isTaskCompletedByMember = (memberId: string) => {
  return membersStore.isTaskCompleted(memberId, props.task.id)
}

const currentMemberId = computed(() => membersStore.currentMember.value?.id || '')

const assignedMember = computed(() => {
  if (props.task.assignedTo.length === 1) {
    return membersStore.members.value.find(m => m.id === props.task.assignedTo[0])
  }
  return null
})

const isCompleted = computed(() => {
  if (currentMemberId.value) {
    return isTaskCompletedByMember(currentMemberId.value)
  }
  return false
})

const frequencyBadge = computed(() => {
  switch (props.task.frequency) {
    case 'daily': return { label: 'Daily', class: 'badge-primary' };
    case 'weekly': return { label: 'Weekly', class: 'badge-warning' };
    default: return { label: 'Once', class: 'badge-success' };
  }
})

const completeTask = (memberId?: string) => {
  const effectiveMemberId = memberId || currentMemberId.value
  
  if (!effectiveMemberId) {
    console.error('No member selected - neither passed nor current')
    return
  }
  
  if (isTaskCompletedByMember(effectiveMemberId)) {
    console.warn('Task already completed')
    return
  }
  
  try {
    membersStore.completeTask(props.task.id, effectiveMemberId)
    membersStore.addPoints(effectiveMemberId, props.task.points)
    
    showParticles.value = true
    setTimeout(() => {
      showParticles.value = false
    }, 2500)
    
    if (import.meta.env.DEV) {
      console.log('Task completed successfully')
    }
  } catch (error) {
    console.error('Error completing task:', error)
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
  selectedMemberId.value = ''
}

const revertTask = (memberId: string) => {
  if (!memberId) {
    console.error('Cannot revert task: No member ID provided')
    return
  }
  
  if (confirm(`确定要撤销完成此任务吗? ${props.task.points}点将被扣除。`)) {
    try {
      membersStore.revertTask(memberId, props.task.id)
      membersStore.deductPoints(memberId, props.task.points)
      console.log('Task reverted successfully')
      alert('任务撤销成功！')
    } catch (error) {
      console.error('Error reverting task:', error)
      alert('任务撤销失败，请重试！')
    }
  }
}
</script>

<template>
  <div class="task-card" :class="{ 'is-complete': isCompleted }">
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
          v-if="!isCompleted && assignedMember" 
          class="btn btn-success" 
          @click="completeTask(assignedMember.id)"
        >
          Complete
        </button>
        
        <div v-else-if="!isCompleted && (props.isForEveryone || task.assignedTo.length === 0)" class="task-everyone-complete">
          <div v-if="!showMemberSelector" class="task-buttons">
            <button 
              class="btn btn-success" 
              @click="showMemberSelector = true"
            >
              Complete
            </button>
            <button 
              v-if="membersStore.currentMember.value"
              class="btn btn-primary" 
              @click="completeTask(membersStore.currentMember.value.id)"
              title="由当前用户完成"
            >
              由{{ membersStore.currentMember.value.name }}完成
            </button>
          </div>
          
          <div v-else class="member-selector">
            <select 
              v-model="selectedMemberId"
              class="select-member"
            >
              <option value="" disabled>Select member</option>
              <option v-for="member in membersStore.members.value" :key="member.id" :value="member.id">
                {{ member.name }}
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
        
        <div v-else-if="isCompleted" class="task-completed">
          <span class="completed-icon">✅</span>
          <span>Completed</span>
          <button 
            class="btn btn-sm btn-outline-danger ml-2"
            @click.stop="currentMemberId ? revertTask(currentMemberId) : null"
          >
            Undo
          </button>
        </div>
      </div>
    </div>
    
    <MemberAvatar 
      v-if="showMember && assignedMember && assignedMember.name" 
      :name="assignedMember.name" 
      :color="assignedMember.color" 
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
  transform: scale(0.98);
  transition: all 0.2s ease;
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
