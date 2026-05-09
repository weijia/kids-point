<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMembers } from '../stores/members'
import { useTasks } from '../stores/tasks'
import type { Task } from '../stores/tasks'
import TaskCard from '../components/task/TaskCard.vue'

const { t } = useI18n()
const router = useRouter()
const membersStore = useMembers()
const tasksStore = useTasks()

const memberCount = computed(() => membersStore.members.value.length)

// Get all members with their points
const members = computed(() => membersStore.members.value)

// Get today's tasks (tasks assigned to current member)
const todaysTasks = computed(() => {
  const currentMemberId = membersStore.currentMember.value?.id
  if (!currentMemberId) return []
  
  return tasksStore.tasks.value.filter(task => {
    return task.assignedTo.includes(currentMemberId)
  })
})

// Group tasks by member
const tasksByMember = computed(() => {
  const result: Record<string, Task[]> = {
    'everyone': []
  }
  
  members.value.forEach(member => {
    result[member.id] = []
  })
  
  todaysTasks.value.forEach(task => {
    const isForEveryone = task.assignedTo.length === 0 || 
      task.assignedTo.every(id => members.value.some(m => m.id === id))
    
    if (isForEveryone) {
      result['everyone'].push(task)
    } else {
      task.assignedTo.forEach(memberId => {
        if (result[memberId]) {
          result[memberId].push(task)
        }
      })
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
const currentMember = computed(() => membersStore.currentMember.value)
</script>

<template>
  <div class="home">
    <!-- Today's Tasks -->
    <section class="todays-tasks" v-if="hasTodaysTasks">
      <h2 v-if="currentMember">{{ currentMember?.name }}的{{ t('home.personalCenter') }}</h2>
      
      <!-- Tasks for everyone -->
      <div v-if="tasksByMember['everyone'].length > 0" class="tasks-section">
        <h3>{{ t('home.tasksForEveryone') }}</h3>
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
        <h3>{{ t('home.tasksFor') }} {{ getMember(memberId)?.name }}</h3>
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
      <h2>{{ t('home.familyPoints') }}</h2>
      <div class="grid grid-auto-fit">
        <div v-for="member in members" :key="member.id" class="card member-card">
          <div class="member-avatar" :style="{ backgroundColor: member.color }">
            {{ member.name.charAt(0).toUpperCase() }}
          </div>
          <h3>{{ member.name }}</h3>
          <div class="points-display">
            <span class="points-value">{{ member.points }}</span>
            <span class="points-label">{{ t('home.points') }}</span>
          </div>
          <button class="btn btn-success" @click="router.push('/store')">{{ t('home.redeemPoints') }}</button>
        </div>
      </div>
    </section>
    
    <section class="hero">
      <div class="hero-content">
        <div v-if="currentMember" class="current-user-welcome">
          <div class="current-user-avatar" :style="{ backgroundColor: currentMember?.color }">
            {{ currentMember?.name?.charAt(0).toUpperCase() }}
          </div>
          <h1>{{ t('home.welcomeBack') }}, {{ currentMember?.name }}!</h1>
        </div>
        <h1 v-else>{{ t('home.welcomeTo') }}</h1>
        <p class="hero-subtitle">{{ t('home.subtitle') }}</p>
        <div class="hero-buttons">
          <button class="btn btn-primary" @click="router.push('/tasks')">{{ t('home.viewTasks') }}</button>
          <button class="btn btn-success" @click="router.push('/store')">{{ t('home.rewardsStore') }}</button>
        </div>
      </div>
    </section>
    
    <section class="dashboard">
      <h2>{{ t('home.quickDashboard') }}</h2>
      
      <div class="grid grid-3">
        <div class="card dashboard-card">
          <div class="dashboard-icon">👨‍👩‍👧‍👦</div>
          <h3>{{ memberCount }}</h3>
          <p>{{ t('home.familyMembers') }}</p>
          <button class="btn btn-primary" @click="router.push('/members')">{{ t('home.manage') }}</button>
        </div>
        
        <div class="card dashboard-card">
          <div class="dashboard-icon">📝</div>
          <h3>{{ tasksStore.tasks.value.length }}</h3>
          <p>{{ t('home.pendingTasks') }}</p>
          <button class="btn btn-primary" @click="router.push('/tasks')">{{ t('home.view') }}</button>
        </div>
        
        <div class="card dashboard-card">
          <div class="dashboard-icon">✅</div>
          <h3>{{ members.reduce((sum, m) => sum + m.completedTasks.length, 0) }}</h3>
          <p>{{ t('home.completedTasks') }}</p>
          <button class="btn btn-primary" @click="router.push('/tasks')">{{ t('home.details') }}</button>
        </div>
      </div>
    </section>
    
    <section class="features">
      <h2>{{ t('home.appFeatures') }}</h2>
      
      <div class="grid grid-4">
        <div class="card feature-card">
          <div class="feature-icon">👨‍👩‍👧‍👦</div>
          <h3>{{ t('home.memberProfiles') }}</h3>
          <p>{{ t('home.memberProfilesDesc') }}</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">📝</div>
          <h3>{{ t('home.taskManagement') }}</h3>
          <p>{{ t('home.taskManagementDesc') }}</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">🏆</div>
          <h3>{{ t('home.leaderboard') }}</h3>
          <p>{{ t('home.leaderboardDesc') }}</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">🛍️</div>
          <h3>{{ t('home.rewardsStore') }}</h3>
          <p>{{ t('home.rewardsStoreDesc') }}</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">🎖️</div>
          <h3>{{ t('achievements.title') }}</h3>
          <p>{{ t('home.achievementsDesc') }}</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">📊</div>
          <h3>{{ t('home.progressCharts') }}</h3>
          <p>{{ t('home.progressChartsDesc') }}</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">✨</div>
          <h3>{{ t('home.animations') }}</h3>
          <p>{{ t('home.animationsDesc') }}</p>
        </div>
        
        <div class="card feature-card">
          <div class="feature-icon">🔒</div>
          <h3>{{ t('home.parentControls') }}</h3>
          <p>{{ t('home.parentControlsDesc') }}</p>
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