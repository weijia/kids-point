<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { useMembers } from '../stores/members'
import type { Member } from '../stores/members'
import MemberAvatar from '../components/member/MemberAvatar.vue'

const { t } = useI18n()
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const membersStore = useMembers()

// Get all members sorted by points (leaderboard)
const leaderboard = computed(() => {
  return [...membersStore.members.value].sort((a, b) => b.points - a.points)
})

// Chart data for points comparison
const chartData = computed(() => {
  const memberNames = leaderboard.value.map((member: Member) => member.name)
  const memberPoints = leaderboard.value.map((member: Member) => member.points)
  const memberColors = leaderboard.value.map((member: Member) => member.color)
  
  return {
    labels: memberNames,
    datasets: [
      {
        label: 'Total Points',
        data: memberPoints,
        backgroundColor: memberColors,
        borderWidth: 0
      }
    ]
  }
})

// Chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          return `${context.parsed.y} points`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Points'
      }
    }
  }
}
</script>

<template>
  <div class="leaderboard-page">
    <div class="page-header">
      <h1>{{ t('leaderboard.title') }}</h1>
      <p>{{ t('leaderboard.description') }}</p>
    </div>
    
    <!-- Chart Section -->
    <div class="chart-section">
      <h2>{{ t('leaderboard.pointsComparison') }}</h2>
      
      <div v-if="leaderboard.length === 0" class="empty-state">
        <p>{{ t('leaderboard.noMembers') }}</p>
      </div>
      
      <div v-else class="chart-container">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>
    
    <!-- Leaderboard Section -->
    <div class="rankings-section">
      <h2>{{ t('leaderboard.rankings') }}</h2>
      
      <div v-if="leaderboard.length === 0" class="empty-state">
        <p>{{ t('leaderboard.noMembers') }}</p>
      </div>
      
      <div v-else class="rankings-list">
        <div 
          v-for="(member, index) in leaderboard" 
          :key="member.id" 
          class="ranking-item"
        >
          <div class="rank">{{ index + 1 }}</div>
          
          <MemberAvatar 
            :name="member.name" 
            :color="member.color" 
            size="md" 
          />
          
          <div class="member-info">
            <h3>{{ member.name }}</h3>
          </div>
          
          <div class="points">
            <span>{{ member.points }}</span>
            <small>{{ t('leaderboard.points') }}</small>
          </div>
          
          <button class="btn btn-primary view-history-btn">{{ t('leaderboard.viewHistory') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.page-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.chart-section, .rankings-section {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
}

.chart-section h2, .rankings-section h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.chart-container {
  height: 300px;
}

.rankings-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: var(--space-md);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ranking-item:hover {
  transform: translateX(4px);
  background-color: var(--primary-light);
}

.rank {
  font-size: var(--font-size-xl);
  font-weight: bold;
  min-width: 40px;
  color: var(--primary-dark);
}

.member-info {
  flex: 1;
  margin-left: var(--space-md);
}

.member-info h3 {
  margin: 0;
}

.points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: var(--space-md);
}

.points span {
  font-size: var(--font-size-lg);
  font-weight: bold;
  color: var(--primary-dark);
}

.points small {
  font-size: var(--font-size-xs);
  color: var(--gray-600);
}

.view-history-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.ranking-item:hover .view-history-btn {
  opacity: 1;
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

.history-modal {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-lg);
}

.member-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.member-header h2 {
  margin: 0;
}

.time-filter {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.history-item {
  display: flex;
  flex-direction: column;
  padding: var(--space-md);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
}

.history-date {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  margin-bottom: var(--space-xs);
}

.history-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-reason {
  font-weight: 600;
}

.history-points {
  font-weight: bold;
  color: var(--success);
}

.history-points.negative {
  color: var(--error);
}

.close-btn {
  align-self: flex-end;
  margin-top: auto;
}

@media (max-width: 768px) {
  .modal-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-md);
  }
  
  .view-history-btn {
    display: none;
  }
}
</style>