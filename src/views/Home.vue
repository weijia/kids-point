<script setup lang="ts">
import { inject, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { MembersStore } from '../stores/members'
import type { TasksStore } from '../stores/tasks'
import type { Task } from '../stores/tasks'
import TaskCard from '../components/task/TaskCard.vue'

const router = useRouter()
const membersStore = inject('membersStore') as MembersStore
const tasksStore = inject('tasksStore') as TasksStore

const memberCount = computed(() => membersStore.members.value.length)
const pendingTasksCount = computed(() => tasksStore.getPendingTasksCount())
const completedTasksCount = computed(() => tasksStore.getCompletedTasksCount())

// Get all members with their points
const members = computed(() => membersStore.members.value)

// Get today's tasks (tasks that are not completed and are due today)
const todaysTasks = computed(() => {
  return tasksStore.tasks.value.filter(task => {
    // Check if task is not complete
    if (task.isComplete) return false
    
    // For daily tasks, always include
    if (task.frequency === 'daily') return true
    
    // For weekly tasks, check if it's the right day of the week
    if (task.frequency === 'weekly') {
      const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
      return task.weeklyDay === today
    }
    
    // For one-time tasks, include if not completed and due today or in the past
    if (task.frequency === 'once') {
      if (!task.dueDate) return true
      const dueDate = new Date(task.dueDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return dueDate <= today
    }
    
    return false
  })
})

// Group tasks by member
const tasksByMember = computed(() => {
  const result: Record<string, Task[]> = {
    'everyone': []
  }
  
  // Initialize with all members
  members.value.forEach(member => {
    result[member.id] = []
  })
  
  // Group tasks
  todaysTasks.value.forEach(task => {
    if (task.memberId === null || task.memberId === undefined) {
      result['everyone'].push(task)
    } else if (result[task.memberId]) {
      result[task.memberId].push(task)
    }
  })
  
  return result
})

// Check if there are any tasks for today
const hasTodaysTasks = computed(() => {
  return todaysTasks.value.length > 0
})

// Get member by ID for display
const filteredMemberIds = computed(() => {
  return Object.keys(tasksByMember.value).filter(memberId => 
    memberId !== 'everyone' && 
    tasksByMember.value[memberId] && 
    tasksByMember.value[memberId].length > 0
  )
})

const getMember = (id: string) => {
  return members.value.find(member => member.id === id)
}

// 获取当前用户信息
const currentMember = computed(() => membersStore.currentMember)
</script>

<template>
  <div class="home">
    <!-- Today's Tasks -->
    <section class="todays-tasks" v-if="hasTodaysTasks">
      <h2 v-if="currentMember">{{ currentMember.name }}的个人中心</h2>
      
      <!-- Tasks for everyone -->
      <div v-if="tasksByMember['everyone'].length > 0" class="tasks-section">
        <h3>Tasks for Everyone</h3>
        <div class="tasks-grid">
          <TaskCard 
            v-for="task in tasksByMember['everyone']" 
            :key="task.id" 
            :task="task"
            :is-for-everyone="true"
          />
        </div>
      </div>
      
      <!-- Tasks for specific members -->
      <div 
        v-for="memberId in filteredMemberIds" 
        :key="memberId"
        class="tasks-section"
      >
        <h3>Tasks for {{ getMember(memberId)?.name }}</h3>
        <div class="tasks-grid">
          <TaskCard 
            v-for="task in tasksByMember[memberId]" 
            :key="task.id" 
            :task="task"
          />
        </div>
      </div>
    </section>
    
    <!-- Members Points Overview -->
    <section class="members-points" v-if="memberCount > 0">
      <h2>Family Points</h2>
      <div class="grid grid-auto-fit">
        <div v-for="member in members" :key="member.id" class="card member-card">
          <div class="member-avatar" :style="{ backgroundColor: member.avatarColor }">
            {{ member.name.charAt(0).toUpperCase() }}
          </div>
          <h3>{{ member.name }}</h3>
          <div class="points-display">
            <span class="points-value">{{ member.points }}</span>
            <span class="points-label">积分</span>
          </div>
          <button class="btn btn-success" @click="router.push('/store')">Redeem Points</button>
        </div>
      </div>
    </section>
    
    <section class="hero">
      <div class="hero-content">
        <div v-if="currentMember" class="current-user-welcome">
          <div class="current-user-avatar" :style="{ backgroundColor: currentMember.avatarColor }">
            {{ currentMember.name.charAt(0).toUpperCase() }}
          </div>
          <h1>欢迎回来，{{ currentMember.name }}!</h1>
        </div>
        <h1 v-else>Welcome to KidPoints!</h1>
        <p class="hero-subtitle">A fun way to reward good behavior and track achievements</p>
        <div class="hero-buttons">
          <button class="btn btn-primary" @click="router.push('/tasks')">View Tasks</button>
          <button class="btn btn-success" @click="router.push('/store')">Rewards Store</button>
        </div>
      </div>
    </section>
    
    <section class="dashboard">
      <h2>Quick Dashboard</h2>
      
      <div class="grid grid-3">
        <div class="card dashboard-card">
          <div class="dashboard-icon">👨‍👩‍👧‍👦</div>
          <h3>{{ memberCount }}</h3>
          <p>Family Members</p>
          <button class="btn btn-primary" @click="router.push('/members')">Manage</button>
        </div>
        
        <div class="card dashboard-card">
          <div class="dashboard-icon">📝</div>
          <h3>{{ pendingTasksCount }}</h3>
          <p>Pending Tasks</p>
          <button class="btn btn-primary" @click="router.push('/tasks')">View</button>
        </div>
        
        <div class="card dashboard-card">
          <div class="dashboard-icon">✅</div>
          <h3>{{ completedTasksCount }}</h3>
          <p>Completed Tasks</p>
          <button class="btn btn-primary" @click="router.push('/tasks')">Details</button>
        </div>
      </div>
    </section>
    
    <section class="features">
      <h2>App Features</h2>
      
      <div class="grid grid-4">
        <div class="card feature-card">
          <div class="feature-icon">👨‍👩‍👧‍👦</div>
          <h3>Member Profiles</h3>
          <p>Create colorful profiles for each family member</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">📝</div>
          <h3>Task Management</h3>
          <p>Create daily and weekly tasks with point values</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">🏆</div>
          <h3>Leaderboard</h3>
          <p>Track progress and compare achievements</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">🛍️</div>
          <h3>Rewards Store</h3>
          <p>Redeem points for exciting rewards</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">🎖️</div>
          <h3>Achievements</h3>
          <p>Collect badges for special accomplishments</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">📊</div>
          <h3>Progress Charts</h3>
          <p>Visualize improvement over time</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">✨</div>
          <h3>Animations</h3>
          <p>Fun particle effects for point increases</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">🔒</div>
          <h3>Parent Controls</h3>
          <p>Secure admin area for parents</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: var(--space-xxl);
}

.hero {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  border-radius: var(--radius-lg);
  padding: var(--space-xxl);
  text-align: center;
  color: var(--gray-900);
  box-shadow: var(--shadow-lg);
}

.hero h1 {
  font-size: var(--font-size-xxxl);
  margin-bottom: var(--space-md);
  color: var(--gray-900);
}

.current-user-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-md);
}

.current-user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xxl);
  font-weight: bold;
  color: white;
  margin-bottom: var(--space-md);
  box-shadow: var(--shadow-md);
  border: 3px solid white;
}

.hero-subtitle {
  font-size: var(--font-size-xl);
  margin-bottom: var(--space-xl);
  opacity: 0.9;
}

.hero-buttons {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
}

.hero-buttons .btn {
  padding: var(--space-md) var(--space-xl);
  font-size: var(--font-size-lg);
}

.dashboard-card, .feature-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-xl);
}

.dashboard-icon, .feature-icon {
  font-size: 3rem;
  margin-bottom: var(--space-md);
}

.dashboard-card h3 {
  font-size: var(--font-size-xxl);
  margin-bottom: var(--space-xs);
  color: var(--primary-dark);
}

.feature-card {
  height: 100%;
}

.feature-card h3 {
  color: var(--primary-dark);
  margin-bottom: var(--space-sm);
}

.feature-card p {
  margin-bottom: 0;
  color: var(--gray-700);
}

/* Members Points Styles */
.members-points {
  margin-bottom: var(--space-xl);
}

.members-points h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.grid-auto-fit {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.member-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-lg);
  transition: transform 0.2s ease;
}

.member-card:hover {
  transform: translateY(-5px);
}

.member-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xl);
  font-weight: bold;
  color: white;
  margin-bottom: var(--space-md);
  box-shadow: var(--shadow-md);
}

.points-display {
  display: flex;
  align-items: baseline;
  margin-bottom: var(--space-md);
}

.points-value {
  font-size: var(--font-size-xxl);
  font-weight: bold;
  color: var(--primary-dark);
  margin-right: var(--space-xs);
}

.points-label {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
}

/* Current User Summary Styles */
.current-user-summary {
  margin-bottom: var(--space-xl);
}

.current-user-summary h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.user-stats {
  display: flex;
  justify-content: center;
  gap: var(--space-xl);
  flex-wrap: wrap;
}

.stat-card {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 150px;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-sm);
}

.stat-value {
  font-size: var(--font-size-xxl);
  font-weight: bold;
  color: var(--primary-dark);
  margin-bottom: var(--space-xs);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
}

/* Today's Tasks Styles */
.todays-tasks {
  margin-bottom: var(--space-xl);
}

.todays-tasks h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.tasks-section {
  margin-bottom: var(--space-xl);
}

.tasks-section h3 {
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--gray-200);
  color: var(--primary-dark);
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .grid-3, .grid-4 {
    grid-template-columns: 1fr;
  }
  
  .hero {
    padding: var(--space-xl);
  }
  
  .hero h1 {
    font-size: var(--font-size-xxl);
  }
  
  .hero-subtitle {
    font-size: var(--font-size-lg);
  }
  
  .hero-buttons {
    flex-direction: column;
  }
  
  .tasks-grid {
    grid-template-columns: 1fr;
  }
  
  .member-card {
    min-width: 100%;
  }
  
  .points-display {
    flex-direction: column;
    align-items: center;
  }
}
</style>