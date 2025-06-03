<script setup lang="ts">
import { inject, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { MembersStore } from '../stores/members'
import type { TasksStore } from '../stores/tasks'

const router = useRouter()
const membersStore = inject('membersStore') as MembersStore
const tasksStore = inject('tasksStore') as TasksStore

const memberCount = computed(() => membersStore.members.length)
const pendingTasksCount = computed(() => tasksStore.getPendingTasksCount())
const completedTasksCount = computed(() => tasksStore.getCompletedTasksCount())
</script>

<template>
  <div class="home">
    <section class="hero">
      <div class="hero-content">
        <h1>Welcome to KidPoints!</h1>
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
}
</style>