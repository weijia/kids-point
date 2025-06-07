<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import type { TasksStore, Task } from '../stores/tasks'
import type { MembersStore } from '../stores/members'
import TaskCard from '../components/task/TaskCard.vue'

const tasksStore = inject('tasksStore') as TasksStore
const membersStore = inject('membersStore') as MembersStore

// New task form data
const newTask = ref({
  title: '',
  description: '',
  icon: '📝',
  points: 10,
  memberId: null as string | null,
  frequency: 'daily' as 'daily' | 'weekly' | 'once'
})

// Task being edited
const editingTask = ref<Task | null>(null)

// Icon options
const iconOptions = [
  '📝', '📚', '🧹', '🧺', '🍽️', '🛏️', '🏃', '🎮', '🎨', '🎵', '🐕', '🌱', '🚿', '🦷', '🧠'
]

// Get all tasks
const tasks = computed(() => tasksStore.tasks)

// Get all members for the dropdown
const members = computed(() => membersStore.members)

// Filter tasks
const filterType = ref('all')
const filterMember = ref('all')

const filteredTasks = computed(() => {
  // Ensure tasks.value is an array before spreading
  const tasksList = Array.isArray(tasks.value) ? tasks.value : []
  let result = [...tasksList]
  
  // Filter by type
  if (filterType.value === 'completed') {
    result = result.filter(task => task.isComplete)
  } else if (filterType.value === 'pending') {
    result = result.filter(task => !task.isComplete)
  }
  
  // Filter by member
  if (filterMember.value !== 'all') {
    result = result.filter(task => 
      task.memberId === filterMember.value || task.memberId === null
    )
  }
  
  return result
})

// Add a new task
const addTask = () => {
  if (newTask.value.title.trim() === '') return
  
  tasksStore.addTask({
    title: newTask.value.title.trim(),
    description: newTask.value.description.trim(),
    icon: newTask.value.icon,
    points: newTask.value.points,
    memberId: newTask.value.memberId,
    frequency: newTask.value.frequency
  })
  
  // Reset form
  newTask.value = {
    title: '',
    description: '',
    icon: '📝',
    points: 10,
    memberId: null,
    frequency: 'daily'
  }
}

// Edit a task
const editTask = (task: Task) => {
  editingTask.value = { ...task }
}

// Update a task
const updateTask = () => {
  if (!editingTask.value) return
  
  tasksStore.updateTask(editingTask.value.id, {
    title: editingTask.value.title,
    description: editingTask.value.description,
    icon: editingTask.value.icon,
    points: editingTask.value.points,
    memberId: editingTask.value.memberId,
    frequency: editingTask.value.frequency
  })
  
  // Close edit form
  editingTask.value = null
}

// Delete a task
const deleteTask = () => {
  if (!editingTask.value) return
  
  const confirmed = confirm(`Are you sure you want to delete the task "${editingTask.value.title}"?`)
  if (confirmed) {
    tasksStore.deleteTask(editingTask.value.id)
    editingTask.value = null
  }
}
</script>

<template>
  <div class="tasks-page">
    <div class="page-header">
      <h1>Tasks</h1>
      <p>Create and manage tasks for your family members to complete.</p>
    </div>
    
    <!-- Add new task form -->
    <div class="card form-card">
      <h2>Create New Task</h2>
      
      <div class="form-row">
        <div class="input-group">
          <label for="task-title">Task Title</label>
          <input 
            type="text" 
            id="task-title" 
            v-model="newTask.title" 
            placeholder="Enter task title"
          />
        </div>
        
        <div class="input-group">
          <label for="task-points">Points</label>
          <input 
            type="number" 
            id="task-points" 
            v-model.number="newTask.points" 
            min="1" 
            max="100"
          />
        </div>
      </div>
      
      <div class="input-group">
        <label for="task-description">Description</label>
        <textarea 
          id="task-description" 
          v-model="newTask.description" 
          placeholder="Enter task description"
          rows="2"
        ></textarea>
      </div>
      
      <div class="form-row">
        <div class="input-group">
          <label for="task-member">Assign To</label>
          <select id="task-member" v-model="newTask.memberId">
            <option :value="null">Everyone</option>
            <option v-for="member in members" :key="member.id" :value="member.id">
              {{ member.name }}
            </option>
          </select>
        </div>
        
        <div class="input-group">
          <label for="task-frequency">Frequency</label>
          <select id="task-frequency" v-model="newTask.frequency">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="once">One Time</option>
          </select>
        </div>
      </div>
      
      <div class="input-group">
        <label>Icon</label>
        <div class="icon-picker">
          <div 
            v-for="icon in iconOptions" 
            :key="icon" 
            class="icon-option"
            :class="{ 'selected': newTask.icon === icon }"
            @click="newTask.icon = icon"
          >
            {{ icon }}
          </div>
        </div>
      </div>
      
      <button class="btn btn-primary" @click="addTask">Create Task</button>
    </div>
    
    <!-- Tasks list -->
    <div class="tasks-section">
      <h2>Task List</h2>
      
      <div class="filters">
        <div class="filter-group">
          <label for="filter-type">Status</label>
          <select id="filter-type" v-model="filterType">
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="filter-member">Member</label>
          <select id="filter-member" v-model="filterMember">
            <option value="all">All Members</option>
            <option v-for="member in members" :key="member.id" :value="member.id">
              {{ member.name }}
            </option>
          </select>
        </div>
      </div>
      
      <div v-if="filteredTasks.length === 0" class="empty-state">
        <p>No tasks found. Create your first task above!</p>
      </div>
      
      <div v-else class="tasks-list">
        <TaskCard 
          v-for="task in filteredTasks" 
          :key="task.id" 
          :task="task"
          showMember
          @click="editTask(task)"
        />
      </div>
    </div>
    
    <!-- Edit task modal -->
    <div class="modal-backdrop" v-if="editingTask" @click="editingTask = null">
      <div class="modal" @click.stop>
        <h2>Edit Task</h2>
        
        <div class="form-row">
          <div class="input-group">
            <label for="edit-title">Task Title</label>
            <input 
              type="text" 
              id="edit-title" 
              v-model="editingTask.title" 
              placeholder="Enter task title"
            />
          </div>
          
          <div class="input-group">
            <label for="edit-points">Points</label>
            <input 
              type="number" 
              id="edit-points" 
              v-model.number="editingTask.points" 
              min="1" 
              max="100"
            />
          </div>
        </div>
        
        <div class="input-group">
          <label for="edit-description">Description</label>
          <textarea 
            id="edit-description" 
            v-model="editingTask.description" 
            placeholder="Enter task description"
            rows="2"
          ></textarea>
        </div>
        
        <div class="form-row">
          <div class="input-group">
            <label for="edit-member">Assign To</label>
            <select id="edit-member" v-model="editingTask.memberId">
              <option :value="null">Everyone</option>
              <option v-for="member in members" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
          </div>
          
          <div class="input-group">
            <label for="edit-frequency">Frequency</label>
            <select id="edit-frequency" v-model="editingTask.frequency">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="once">One Time</option>
            </select>
          </div>
        </div>
        
        <div class="input-group">
          <label>Icon</label>
          <div class="icon-picker">
            <div 
              v-for="icon in iconOptions" 
              :key="icon" 
              class="icon-option"
              :class="{ 'selected': editingTask.icon === icon }"
              @click="editingTask.icon = icon"
            >
              {{ icon }}
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-danger" @click="deleteTask">Delete</button>
          <button class="btn btn-primary" @click="updateTask">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tasks-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.page-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.form-card {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.form-row {
  display: flex;
  gap: var(--space-md);
}

.form-row .input-group {
  flex: 1;
}

.icon-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.icon-option {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-option:hover {
  background-color: var(--primary-light);
  transform: scale(1.1);
}

.icon-option.selected {
  background-color: var(--primary);
  transform: scale(1.1);
}

.tasks-section {
  margin-top: var(--space-xl);
}

.tasks-section h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.filters {
  display: flex;
  justify-content: center;
  gap: var(--space-lg);
  margin-bottom: var(--space-lg);
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  background-color: var(--gray-100);
  border-radius: var(--radius-lg);
  color: var(--gray-600);
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  width: 90%;
  max-width: 600px;
  box-shadow: var(--shadow-xl);
}

.modal h2 {
  margin-bottom: var(--space-lg);
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-lg);
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .filters {
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }
}
</style>