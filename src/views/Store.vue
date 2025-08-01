<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import type { RewardsStore, Reward } from '../stores/rewards'
import type { MembersStore, Member } from '../stores/members'
import RewardCard from '../components/reward/RewardCard.vue'
import MemberAvatar from '../components/member/MemberAvatar.vue'

const rewardsStore = inject('rewardsStore') as RewardsStore
const membersStore = inject('membersStore') as MembersStore

// Selected member for the store
const selectedMemberId = ref('')

// New reward form data (for admin only)
const newReward = ref({
  title: '',
  description: '',
  icon: '🎁',
  points: 50
})

// Reward being edited
const editingReward = ref<Reward | null>(null)
const showEditForm = ref(false)
const editForm = ref({
  title: '',
  description: '',
  icon: '🎁',
  points: 50
})

// Reward to delete
const rewardToDelete = ref<Reward | null>(null)
const showDeleteConfirm = ref(false)

// Icon options
const iconOptions = [
  '🎁', '🧸', '🎮', '🍦', '🍕', '🎬', '📱', '⌚', '🎨', '📚', '🎯', '🎪', '🏖️', '🎭', '🎠'
]

// Get all members
const members = computed(() => {
  return membersStore.members.value
})

// Get the selected member
const selectedMember = computed(() => {
  if (!selectedMemberId.value && members.value.length > 0) {
    selectedMemberId.value = members.value[0].id
  }
  return membersStore.getMemberById(selectedMemberId.value)
})

// Get all rewards
const rewards = computed(() => {
  return rewardsStore.rewards
})

// Get redemption history for selected member
const redemptionHistory = computed(() => {
  if (!selectedMember.value) return []
  return rewardsStore.getRedemptionsByMember(selectedMember.value.id)
})

// Handle reward redemption
const redeemSuccess = ref(false)
const redeemedReward = ref<Reward | null>(null)

const onRewardRedeemed = (reward: Reward) => {
  // Show a success message
  redeemedReward.value = reward
  redeemSuccess.value = true
  
  // Hide the success message after 3 seconds
  setTimeout(() => {
    redeemSuccess.value = false
    redeemedReward.value = null
  }, 3000)
}

// Add a new reward (admin only)
const addReward = () => {
  if (newReward.value.title.trim() === '') return
  
  rewardsStore.addReward({
    title: newReward.value.title.trim(),
    description: newReward.value.description.trim(),
    icon: newReward.value.icon,
    points: newReward.value.points
  })
  
  // Reset form
  newReward.value = {
    title: '',
    description: '',
    icon: '🎁',
    points: 50
  }
}

// Success messages
const showEditSuccess = ref(false)
const showDeleteSuccess = ref(false)

// Edit a reward
const openEditForm = (reward: Reward) => {
  editingReward.value = reward
  editForm.value = {
    title: reward.title,
    description: reward.description,
    icon: reward.icon,
    points: reward.points
  }
  showEditForm.value = true
}

const saveEditedReward = () => {
  if (!editingReward.value || editForm.value.title.trim() === '') return
  
  rewardsStore.updateReward(editingReward.value.id, {
    title: editForm.value.title.trim(),
    description: editForm.value.description.trim(),
    icon: editForm.value.icon,
    points: editForm.value.points
  })
  
  // Close form
  showEditForm.value = false
  editingReward.value = null
  
  // Show success message
  showEditSuccess.value = true
  setTimeout(() => {
    showEditSuccess.value = false
  }, 3000)
}

// Delete a reward
const openDeleteConfirm = (reward: Reward) => {
  rewardToDelete.value = reward
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  if (!rewardToDelete.value) return
  
  rewardsStore.deleteReward(rewardToDelete.value.id)
  
  // Close confirmation
  showDeleteConfirm.value = false
  rewardToDelete.value = null
  
  // Show success message
  showDeleteSuccess.value = true
  setTimeout(() => {
    showDeleteSuccess.value = false
  }, 3000)
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  rewardToDelete.value = null
}

// Format date
const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="store-page">
    <div class="page-header">
      <h1>Rewards Store</h1>
      <p>Redeem your hard-earned points for exciting rewards!</p>
    </div>
    
    <!-- Member Selector -->
    <div v-if="members.length > 0" class="member-selector">
      <label for="member-select">Shopping as:</label>
      <select id="member-select" v-model="selectedMemberId">
        <option v-for="member in members" :key="member.id" :value="member.id">
          {{ member.name }} ({{ member.points }} points)
        </option>
      </select>
    </div>
    
    <div v-if="members.length === 0" class="empty-state">
      <p>No family members added yet. Add members before visiting the store!</p>
    </div>
    
    <div v-else-if="!selectedMember" class="empty-state">
      <p>Please select a family member to browse the store.</p>
    </div>
    
    <div v-else class="store-content">
      <!-- Member Info -->
      <div class="member-info-card">
        <div class="member-info-header">
          <MemberAvatar 
            :name="selectedMember.name" 
            :color="selectedMember.avatarColor" 
            size="lg" 
          />
          <h2>{{ selectedMember.name }}</h2>
        </div>
        
        <div class="member-points">
          <span class="points-value">{{ selectedMember.points }}</span>
          <span class="points-label">Available Points</span>
        </div>
      </div>
      
      <!-- Rewards Section -->
      <div class="rewards-section">
        <h2>Available Rewards</h2>
        
        <div v-if="rewards.length === 0" class="empty-state">
          <p>No rewards available yet. Check back soon!</p>
        </div>
        
        <div v-else class="rewards-grid">
          <RewardCard 
            v-for="reward in rewards" 
            :key="reward.id" 
            :reward="reward"
            :memberId="selectedMember.id"
            @redeemed="onRewardRedeemed"
          />
        </div>
      </div>
      
      <!-- Admin Section -->
      <div v-if="selectedMember?.isAdmin" class="admin-section">
        <h2>Reward Management</h2>
        
        <!-- Existing Rewards Management -->
        <div class="admin-rewards-list">
          <h3>Manage Existing Rewards</h3>
          <div v-if="rewards.length === 0" class="empty-state">
            <p>No rewards available. Add your first reward below!</p>
          </div>
          <div v-else class="admin-rewards-grid">
            <div v-for="reward in rewards" :key="reward.id" class="admin-reward-item">
              <div class="admin-reward-content">
                <div class="admin-reward-icon">{{ reward.icon }}</div>
                <div class="admin-reward-info">
                  <h4>{{ reward.title }}</h4>
                  <p>{{ reward.points }} points</p>
                </div>
              </div>
              <div class="admin-reward-actions">
                <button @click="openEditForm(reward)" class="btn-edit">Edit</button>
                <button @click="openDeleteConfirm(reward)" class="btn-delete">Delete</button>
              </div>
            </div>
          </div>
        </div>
        
        <h3 class="mt-lg">Add New Reward</h3>
        <form @submit.prevent="addReward" class="admin-form">
          <div class="form-group">
            <label for="reward-title">Title</label>
            <input 
              id="reward-title"
              v-model="newReward.title"
              type="text"
              required
              placeholder="Enter reward title"
            >
          </div>
          
          <div class="form-group">
            <label for="reward-description">Description</label>
            <textarea
              id="reward-description"
              v-model="newReward.description"
              placeholder="Enter reward description"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>Icon</label>
            <div class="icon-selector">
              <button
                v-for="icon in iconOptions"
                :key="icon"
                type="button"
                :class="{ selected: newReward.icon === icon }"
                @click="newReward.icon = icon"
              >
                {{ icon }}
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label for="reward-points">Points Required</label>
            <input
              id="reward-points"
              v-model.number="newReward.points"
              type="number"
              required
              min="1"
            >
          </div>
          
          <button type="submit" class="submit-button">Add Reward</button>
        </form>
      </div>
      
      <!-- Redemption History -->
      <div class="history-section">
        <h2>Redemption History</h2>
        
        <div v-if="redemptionHistory.length === 0" class="empty-state">
          <p>No rewards redeemed yet. Use your points to get something special!</p>
        </div>
        
        <div v-else class="history-list">
          <div v-for="(item, index) in redemptionHistory" :key="index" class="history-item">
            <div class="history-icon">{{ item.reward.icon }}</div>
            <div class="history-content">
              <h4>{{ item.reward.title }}</h4>
              <p class="history-date">Redeemed on {{ formatDate(item.date) }}</p>
            </div>
            <div class="history-points">
              <span>{{ item.reward.points }}</span>
              <small>points</small>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Success Messages -->
    <div v-if="redeemSuccess" class="redemption-success">
      <div class="success-content">
        <div class="success-icon">🎉</div>
        <div class="success-message">
          <h3>Congratulations!</h3>
          <p>You've successfully redeemed "{{ redeemedReward?.title }}" for {{ redeemedReward?.points }} points!</p>
        </div>
      </div>
    </div>
    
    <div v-if="showEditSuccess" class="redemption-success" style="background-color: var(--primary);">
      <div class="success-content">
        <div class="success-icon">✅</div>
        <div class="success-message">
          <h3>Reward Updated</h3>
          <p>The reward has been successfully updated.</p>
        </div>
      </div>
    </div>
    
    <div v-if="showDeleteSuccess" class="redemption-success" style="background-color: var(--gray-700);">
      <div class="success-content">
        <div class="success-icon">🗑️</div>
        <div class="success-message">
          <h3>Reward Deleted</h3>
          <p>The reward has been successfully removed.</p>
        </div>
      </div>
    </div>
    
    <!-- Edit Reward Modal -->
    <div v-if="showEditForm" class="modal">
      <div class="modal-overlay" @click="showEditForm = false"></div>
      <div class="modal-container">
        <div class="modal-header">
          <h3>Edit Reward</h3>
          <button @click="showEditForm = false" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveEditedReward" class="admin-form">
            <div class="form-group">
              <label for="edit-reward-title">Title</label>
              <input 
                id="edit-reward-title"
                v-model="editForm.title"
                type="text"
                required
                placeholder="Enter reward title"
              >
            </div>
            
            <div class="form-group">
              <label for="edit-reward-description">Description</label>
              <textarea
                id="edit-reward-description"
                v-model="editForm.description"
                placeholder="Enter reward description"
              ></textarea>
            </div>
            
            <div class="form-group">
              <label>Icon</label>
              <div class="icon-selector">
                <button
                  v-for="icon in iconOptions"
                  :key="icon"
                  type="button"
                  :class="{ selected: editForm.icon === icon }"
                  @click="editForm.icon = icon"
                >
                  {{ icon }}
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label for="edit-reward-points">Points Required</label>
              <input
                id="edit-reward-points"
                v-model.number="editForm.points"
                type="number"
                required
                min="1"
              >
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="showEditForm = false" class="btn-cancel">Cancel</button>
              <button type="submit" class="btn-save">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal">
      <div class="modal-overlay" @click="cancelDelete"></div>
      <div class="modal-container delete-modal">
        <div class="modal-header">
          <h3>Delete Reward</h3>
          <button @click="cancelDelete" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">⚠️</div>
            <p>Are you sure you want to delete <strong>{{ rewardToDelete?.title }}</strong>?</p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>
          
          <div class="modal-actions">
            <button @click="cancelDelete" class="btn-cancel">Cancel</button>
            <button @click="confirmDelete" class="btn-delete">Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.store-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.page-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.member-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.member-selector select {
  min-width: 200px;
}

.store-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.member-info-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-lg);
  background-color: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.member-info-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: var(--space-md);
}

.member-info-header h2 {
  margin-top: var(--space-sm);
  margin-bottom: 0;
}

.member-points {
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--primary-light);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  min-width: 200px;
}

.points-value {
  font-size: var(--font-size-xxl);
  font-weight: bold;
  color: var(--primary-dark);
}

.points-label {
  font-size: var(--font-size-sm);
  color: var(--gray-700);
}

.rewards-section, .history-section {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
}

.rewards-section h2, .history-section h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-lg);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.history-item {
  display: flex;
  align-items: center;
  padding: var(--space-md);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
}

.history-icon {
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

.history-content {
  flex: 1;
}

.history-content h4 {
  margin: 0;
  margin-bottom: var(--space-xs);
}

.history-date {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  margin: 0;
}

.history-points {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.history-points span {
  font-size: var(--font-size-lg);
  font-weight: bold;
  color: var(--primary-dark);
}

.history-points small {
  font-size: var(--font-size-xs);
  color: var(--gray-600);
}

.empty-state {
  text-align: center;
  padding: var(--space-xl);
  background-color: var(--gray-100);
  border-radius: var(--radius-lg);
  color: var(--gray-600);
}

.admin-section {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-md);
}

.admin-rewards-list {
  margin-bottom: var(--space-xl);
}

.admin-rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.admin-reward-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  background-color: var(--gray-100);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.admin-reward-item:hover {
  background-color: var(--gray-200);
}

.admin-reward-content {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.admin-reward-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  background-color: var(--white);
  border-radius: var(--radius-md);
}

.admin-reward-info h4 {
  margin: 0;
  margin-bottom: var(--space-xs);
}

.admin-reward-info p {
  margin: 0;
  color: var(--gray-600);
}

.admin-reward-actions {
  display: flex;
  gap: var(--space-sm);
}

.mt-lg {
  margin-top: var(--space-xl);
}

.admin-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-group label {
  font-weight: bold;
  color: var(--gray-700);
}

.form-group input,
.form-group textarea {
  padding: var(--space-sm);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.icon-selector {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: var(--space-sm);
}

.icon-selector button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  background-color: var(--white);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--font-size-lg);
}

.icon-selector button:hover {
  background-color: var(--primary-light);
  border-color: var(--primary);
}

.icon-selector button.selected {
  background-color: var(--primary-light);
  border-color: var(--primary);
  box-shadow: var(--shadow-sm);
}

.submit-button {
  padding: var(--space-md) var(--space-lg);
  background-color: var(--primary);
  color: var(--white);
  border: none;
  border-radius: var(--radius-md);
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-top: var(--space-md);
}

.submit-button:hover {
  background-color: var(--primary-dark);
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-container {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 1001;
  box-shadow: var(--shadow-lg);
}

.delete-modal {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--gray-200);
}

.modal-header h3 {
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--gray-600);
}

.modal-body {
  padding: var(--space-lg);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.btn-cancel, .btn-save, .btn-delete, .btn-edit {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-md);
  font-weight: bold;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-cancel {
  background-color: var(--gray-300);
  color: var(--gray-700);
}

.btn-cancel:hover {
  background-color: var(--gray-400);
}

.btn-save {
  background-color: var(--primary);
  color: var(--white);
}

.btn-save:hover {
  background-color: var(--primary-dark);
}

.btn-edit {
  background-color: var(--primary-light);
  color: var(--primary-dark);
}

.btn-edit:hover {
  background-color: var(--primary);
  color: var(--white);
}

.btn-delete {
  background-color: var(--danger-light);
  color: var(--danger);
}

.btn-delete:hover {
  background-color: var(--danger);
  color: var(--white);
}

.delete-warning {
  text-align: center;
  padding: var(--space-lg) 0;
}

.warning-icon {
  font-size: 40px;
  margin-bottom: var(--space-md);
}

.warning-text {
  color: var(--danger);
  font-weight: bold;
  margin-top: var(--space-sm);
}

/* Redemption Success Message */
.redemption-success {
  position: fixed;
  bottom: var(--space-lg);
  right: var(--space-lg);
  background-color: var(--success);
  color: var(--white);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

.success-content {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.success-icon {
  font-size: 24px;
}

.success-message h3 {
  margin: 0 0 var(--space-xs) 0;
}

.success-message p {
  margin: 0;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .rewards-grid {
    grid-template-columns: 1fr;
  }
  
  .admin-form {
    max-width: 100%;
  }
  
  .icon-selector {
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
  }
  
  .admin-rewards-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-container {
    width: 95%;
    max-height: 80vh;
  }
  
  .redemption-success {
    left: var(--space-md);
    right: var(--space-md);
    bottom: var(--space-md);
  }
}
</style>