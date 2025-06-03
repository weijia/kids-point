<script setup lang="ts">
import { ref, inject, computed, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import type { MembersStore, Member, PointHistoryEntry } from '../stores/members'
import MemberAvatar from '../components/member/MemberAvatar.vue'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const membersStore = inject('membersStore') as MembersStore

// Selected member for history
const selectedMember = ref<Member | null>(null)

// Chart time range
const timeRange = ref('week')

// Get all members sorted by points (leaderboard)
const leaderboard = computed(() => {
  return membersStore.getLeaderboard()
})

// Chart data for points comparison
const chartData = computed(() => {
  const memberNames = leaderboard.value.map(member => member.name)
  const memberPoints = leaderboard.value.map(member => member.points)
  const memberColors = leaderboard.value.map(member => member.avatarColor)
  
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

// Filter point history by time range
const getFilteredHistory = (history: PointHistoryEntry[]) => {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const oneWeek = 7 * oneDay
  const oneMonth = 30 * oneDay
  
  let cutoff = now
  
  if (timeRange.value === 'week') {
    cutoff = now - oneWeek
  } else if (timeRange.value === 'month') {
    cutoff = now - oneMonth
  } else if (timeRange.value === 'year') {
    cutoff = now - (365 * oneDay)
  }
  
  return history.filter(entry => entry.date >= cutoff)
}

// History for selected member
const memberHistory = computed(() => {
  if (!selectedMember.value) return []
  
  const history = membersStore.getMemberPointsHistory(selectedMember.value.id)
  const filteredHistory = getFilteredHistory(history)
  
  // Sort by date (newest first)
  return filteredHistory.sort((a, b) => b.date - a.date)
})

// Format date
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// View member history
const viewMemberHistory = (member: Member) => {
  selectedMember.value = member
}

// Close history modal
const closeHistoryModal = () => {
  selectedMember.value = null
}
</script>

<template>
  <div class="leaderboard-page">
    <div class="page-header">
      <h1>Leaderboard</h1>
      <p>See who's leading in points and track progress over time.</p>
    </div>
    
    <!-- Chart Section -->
    <div class="chart-section">
      <h2>Points Comparison</h2>
      
      <div v-if="leaderboard.length === 0" class="empty-state">
        <p>No members added yet. Add family members to see the leaderboard!</p>
      </div>
      
      <div v-else class="chart-container">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>
    
    <!-- Leaderboard Section -->
    <div class="rankings-section">
      <h2>Rankings</h2>
      
      <div v-if="leaderboard.length === 0" class="empty-state">
        <p>No members added yet. Add family members to see the leaderboard!</p>
      </div>
      
      <div v-else class="rankings-list">
        <div 
          v-for="(member, index) in leaderboard" 
          :key="member.id" 
          class="ranking-item"
          @click="viewMemberHistory(member)"
        >
          <div class="rank">{{ index + 1 }}</div>
          
          <MemberAvatar 
            :name="member.name" 
            :color="member.avatarColor" 
            size="md" 
          />
          
          <div class="member-info">
            <h3>{{ member.name }}</h3>
          </div>
          
          <div class="points">
            <span>{{ member.points }}</span>
            <small>points</small>
          </div>
          
          <button class="btn btn-primary view-history-btn">View History</button>
        </div>
      </div>
    </div>
    
    <!-- Member History Modal -->
    <div class="modal-backdrop" v-if="selectedMember" @click="closeHistoryModal">
      <div class="modal history-modal" @click.stop>
        <div class="modal-header">
          <div class="member-header">
            <MemberAvatar 
              :name="selectedMember.name" 
              :color="selectedMember.avatarColor" 
              size="md" 
            />
            <h2>{{ selectedMember.name }}'s History</h2>
          </div>
          
          <div class="time-filter">
            <label for="time-range">Time Range:</label>
            <select id="time-range" v-model="timeRange">
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
        
        <div v-if="memberHistory.length === 0" class="empty-state">
          <p>No point history in the selected time range.</p>
        </div>
        
        <div v-else class="history-list">
          <div v-for="(entry, index) in memberHistory" :key="index" class="history-item">
            <div class="history-date">
              {{ formatDate(entry.date) }}
            </div>
            
            <div class="history-details">
              <div class="history-reason">{{ entry.reason }}</div>
              <div class="history-points" :class="{ 'negative': entry.points < 0 }">
                {{ entry.points > 0 ? '+' : '' }}{{ entry.points }} points
              </div>
            </div>
          </div>
        </div>
        
        <button class="btn btn-primary close-btn" @click="closeHistoryModal">Close</button>
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