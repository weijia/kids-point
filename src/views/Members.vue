<script setup lang="ts">
import { ref, inject, computed } from 'vue'
import type { MembersStore, Member } from '../stores/members'
import MemberCard from '../components/member/MemberCard.vue'
import MemberAvatar from '../components/member/MemberAvatar.vue'

const membersStore = inject('membersStore') as MembersStore

// New member form data
const newMember = ref({
  name: '',
  avatarColor: '#3B82F6' // Default color
})

// Member being edited
const editingMember = ref<Member | null>(null)

// Avatar color options
const colorOptions = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316'  // Orange
]

// Get all members
const members = computed(() => {
  return membersStore.members.value
})

// Add a new member
const addMember = () => {
  if (newMember.value.name.trim() === '') return
  
  membersStore.addMember(
    newMember.value.name.trim(),
    newMember.value.avatarColor
  )
  
  // Reset form
  newMember.value = {
    name: '',
    avatarColor: '#3B82F6'
  }
}

// Select a member for editing
const selectMember = (member: Member) => {
  editingMember.value = { ...member }
}

// Update a member
const updateMember = () => {
  if (!editingMember.value) return
  
  membersStore.updateMember(editingMember.value.id, {
    name: editingMember.value.name,
    avatarColor: editingMember.value.avatarColor
  })
  
  // Close edit form
  editingMember.value = null
}

// Delete a member
const deleteMember = () => {
  if (!editingMember.value) return
  
  const confirmed = confirm(`Are you sure you want to delete ${editingMember.value.name}?`)
  if (confirmed) {
    membersStore.deleteMember(editingMember.value.id)
    editingMember.value = null
  }
}
</script>

<template>
  <div class="members-page">
    <div class="page-header">
      <h1>Family Members</h1>
      <p>Manage the members of your family who can earn points and redeem rewards.</p>
    </div>
    
    <!-- Add new member form -->
    <div class="card form-card">
      <h2>Add New Member</h2>
      
      <div class="input-group">
        <label for="member-name">Name</label>
        <input 
          type="text" 
          id="member-name" 
          v-model="newMember.name" 
          placeholder="Enter name"
        />
      </div>
      
      <div class="input-group">
        <label>Avatar Color</label>
        <div class="color-picker">
          <div 
            v-for="color in colorOptions" 
            :key="color" 
            class="color-option"
            :style="{ backgroundColor: color }"
            :class="{ 'selected': newMember.avatarColor === color }"
            @click="newMember.avatarColor = color"
          ></div>
        </div>
      </div>
      
      <div class="preview">
        <p>Preview:</p>
        <div class="avatar-preview">
          <MemberAvatar 
            :name="newMember.name || 'Preview'" 
            :color="newMember.avatarColor" 
            size="md" 
          />
          <span>{{ newMember.name || 'Preview' }}</span>
        </div>
      </div>
      
      <button class="btn btn-primary" @click="addMember">Add Member</button>
    </div>
    
    <!-- Members list -->
    <div class="members-section">
      <h2>Your Family</h2>
      
      <div v-if="members.length === 0" class="empty-state">
        <p>No members added yet. Add your first family member above!</p>
      </div>
      
      <div v-else class="members-grid">
        <MemberCard 
          v-for="member in members" 
          :key="member.id" 
          :member="member"
          @select="selectMember"
        />
      </div>
    </div>
    
    <!-- Edit member modal -->
    <div class="modal-backdrop" v-if="editingMember" @click="editingMember = null">
      <div class="modal" @click.stop>
        <h2>Edit Member</h2>
        
        <div class="input-group">
          <label for="edit-name">Name</label>
          <input 
            type="text" 
            id="edit-name" 
            v-model="editingMember.name" 
            placeholder="Enter name"
          />
        </div>
        
        <div class="input-group">
          <label>Avatar Color</label>
          <div class="color-picker">
            <div 
              v-for="color in colorOptions" 
              :key="color" 
              class="color-option"
              :style="{ backgroundColor: color }"
              :class="{ 'selected': editingMember.avatarColor === color }"
              @click="editingMember.avatarColor = color"
            ></div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-danger" @click="deleteMember">Delete</button>
          <button class="btn btn-primary" @click="updateMember">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.members-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.page-header {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.form-card {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: var(--gray-900);
  transform: scale(1.1);
}

.preview {
  margin-bottom: var(--space-md);
}

.avatar-preview {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-sm);
}

.members-section {
  margin-top: var(--space-xl);
}

.members-section h2 {
  text-align: center;
  margin-bottom: var(--space-lg);
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-lg);
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
  max-width: 500px;
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
  .members-grid {
    grid-template-columns: 1fr;
  }
}
</style>