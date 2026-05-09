<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettings } from '../stores/settings'

const { t } = useI18n()
const settingsStore = useSettings()
const router = useRouter()

const password = ref('')
const error = ref('')
const isInitialSetup = ref(settingsStore.settings.adminPassword === null)
const confirmPassword = ref('')

const login = () => {
  if (isInitialSetup.value) {
    // Setting up the password for the first time
    if (password.value.length < 4) {
      error.value = 'Password must be at least 4 characters long'
      return
    }
    
    if (password.value !== confirmPassword.value) {
      error.value = 'Passwords do not match'
      return
    }
    
    settingsStore.setAdminPassword(password.value)
    settingsStore.login(password.value)
    router.push('/admin')
  } else {
    // Normal login
    const success = settingsStore.login(password.value)
    
    if (success) {
      router.push('/admin')
    } else {
      error.value = 'Incorrect password'
      setTimeout(() => {
        error.value = ''
      }, 3000)
    }
  }
}
</script>

<template>
  <div class="admin-login-page">
    <div class="login-card">
      <h1>{{ isInitialSetup ? t('adminLogin.setupParentAccess') : t('adminLogin.parentLogin') }}</h1>
      <p>{{ isInitialSetup ? t('adminLogin.createPasswordDesc') : t('adminLogin.enterPasswordDesc') }}</p>
      
      <div class="input-group">
        <label for="password">{{ isInitialSetup ? t('adminLogin.createPassword') : t('adminLogin.password') }}</label>
        <input 
          type="password" 
          id="password" 
          v-model="password" 
          :placeholder="t('adminLogin.enterPassword')" 
          @keyup.enter="login"
        />
      </div>
      
      <div class="input-group" v-if="isInitialSetup">
        <label for="confirm-password">{{ t('adminLogin.confirmPassword') }}</label>
        <input 
          type="password" 
          id="confirm-password" 
          v-model="confirmPassword" 
          :placeholder="t('adminLogin.confirmPassword')" 
          @keyup.enter="login"
        />
      </div>
      
      <div class="error-message" v-if="error">{{ error }}</div>
      
      <button class="btn btn-primary login-btn" @click="login">
        {{ isInitialSetup ? t('adminLogin.createPassword') : t('adminLogin.login') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.admin-login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
}

.login-card {
  background-color: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-xl);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 400px;
}

.login-card h1 {
  text-align: center;
  margin-bottom: var(--space-sm);
}

.login-card p {
  text-align: center;
  color: var(--gray-600);
  margin-bottom: var(--space-lg);
}

.login-btn {
  width: 100%;
  margin-top: var(--space-md);
}

.error-message {
  color: var(--error);
  text-align: center;
  margin-top: var(--space-sm);
  font-weight: 600;
}
</style>