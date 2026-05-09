<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettings } from '../../stores/settings'
import { type MembersStore } from '../../stores/members'
import { supportedLocales, type SupportedLocale } from '../../i18n'

const router = useRouter()
const route = useRoute()
const { locale } = useI18n()
const settingsStore = useSettings()
const membersStore = inject('membersStore') as MembersStore

const isMenuOpen = ref(false)

const members = computed(() => membersStore.members.value)
const currentMember = computed(() => membersStore.currentMember)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const isActive = (routeName: string) => {
  return route.name === routeName
}

const isAuthenticated = computed(() => {
  return settingsStore.isAuthenticated
})

const handleMemberChange = (event: Event) => {
  const select = event.target as HTMLSelectElement
  const memberId = select.value
  
  if (memberId) {
    membersStore.setCurrentMember(memberId)
    if (route.path !== '/') {
      router.push('/')
    }
  }
}

const changeLanguage = (lang: SupportedLocale) => {
  locale.value = lang
  settingsStore.setLocale(lang)
}

const currentLanguage = computed(() => {
  return supportedLocales.find(l => l.code === locale.value) || supportedLocales[0]
})
</script>

<template>
  <header class="navbar">
    <div class="navbar-container">
      <div class="navbar-logo" @click="router.push('/')">
        <h1>🏆 KidPoints</h1>
      </div>
      
      <button class="navbar-toggle" @click="toggleMenu" aria-label="Toggle navigation menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <nav class="navbar-menu" :class="{ 'is-open': isMenuOpen }">
        <div class="member-selector" v-if="members.length > 0">
          <select :value="currentMember?.id || ''" @change="handleMemberChange">
            <option value="" disabled>{{ $t('nav.selectMember') }}</option>
            <option v-for="member in members" :key="member.id" :value="member.id">
              {{ member.name }}
            </option>
          </select>
        </div>

        <div class="language-selector">
          <button class="lang-btn" @click="changeLanguage(currentLanguage.code === 'en' ? 'zh' : 'en')">
            {{ currentLanguage.flag }} {{ currentLanguage.code.toUpperCase() }}
          </button>
        </div>
        
        <ul class="navbar-nav">
          <li class="nav-item" :class="{ 'active': isActive('Home') }">
            <router-link to="/" @click="closeMenu">🏠 {{ $t('nav.home') }}</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Members') }">
            <router-link to="/members" @click="closeMenu">👨‍👩‍👧‍👦 {{ $t('nav.members') }}</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Tasks') }">
            <router-link to="/tasks" @click="closeMenu">📝 {{ $t('nav.tasks') }}</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Leaderboard') }">
            <router-link to="/leaderboard" @click="closeMenu">🏅 {{ $t('nav.leaderboard') }}</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Store') }">
            <router-link to="/store" @click="closeMenu">🛍️ {{ $t('nav.store') }}</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Achievements') }">
            <router-link to="/achievements" @click="closeMenu">🎖️ {{ $t('nav.achievements') }}</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('AdminLogin') || isActive('AdminPanel') }">
            <router-link :to="isAuthenticated ? '/admin' : '/admin-login'" @click="closeMenu">
              🔒 {{ isAuthenticated ? $t('nav.admin') : $t('nav.parentLogin') }}
            </router-link>
          </li>
        </ul>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.navbar {
  background-color: var(--white);
  box-shadow: var(--shadow-md);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md);
  max-width: 1200px;
  margin: 0 auto;
}

.navbar-logo {
  cursor: pointer;
}

.navbar-logo h1 {
  font-size: var(--font-size-xl);
  margin: 0;
  color: var(--primary-dark);
}

.navbar-toggle {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 21px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.navbar-toggle span {
  display: block;
  height: 3px;
  width: 100%;
  background-color: var(--gray-800);
  border-radius: 3px;
}

.member-selector {
  margin-right: var(--space-md);
}

.member-selector select {
  padding: var(--space-xs) var(--space-sm);
  border: 2px solid var(--primary);
  border-radius: var(--radius-md);
  background-color: var(--white);
  font-weight: 600;
  color: var(--gray-800);
  cursor: pointer;
  transition: all 0.2s ease;
}

.member-selector select:hover {
  border-color: var(--primary-dark);
}

.member-selector select:focus {
  outline: none;
  box-shadow: 0 0 0 2px var(--primary-light);
}

.language-selector {
  margin-right: var(--space-md);
}

.lang-btn {
  padding: var(--space-xs) var(--space-sm);
  border: 2px solid var(--primary);
  border-radius: var(--radius-md);
  background-color: var(--white);
  font-weight: 600;
  color: var(--gray-800);
  cursor: pointer;
  transition: all 0.2s ease;
}

.lang-btn:hover {
  border-color: var(--primary-dark);
  background-color: var(--primary-light);
}

.navbar-nav {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin: 0 var(--space-sm);
}

.nav-item a {
  display: block;
  padding: var(--space-sm);
  color: var(--gray-700);
  text-decoration: none;
  font-weight: 600;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.nav-item a:hover {
  color: var(--primary-dark);
  background-color: var(--gray-100);
}

.nav-item.active a {
  color: var(--primary-dark);
  background-color: var(--primary-light);
}

@media (max-width: 768px) {
  .navbar-toggle {
    display: flex;
  }
  
  .navbar-menu {
    position: fixed;
    top: 60px;
    left: 0;
    width: 100%;
    background-color: var(--white);
    box-shadow: var(--shadow-md);
    padding: var(--space-md) 0;
    transform: translateY(-100%);
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
  }
  
  .navbar-menu.is-open {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
  }
  
  .navbar-menu {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .member-selector {
    margin: 0 0 var(--space-md);
    width: 80%;
  }
  
  .member-selector select {
    width: 100%;
  }

  .language-selector {
    margin: 0 0 var(--space-md);
  }

  .lang-btn {
    width: 80%;
  }
  
  .navbar-nav {
    flex-direction: column;
    width: 100%;
  }
  
  .nav-item {
    margin: 0;
  }
  
  .nav-item a {
    padding: var(--space-md);
  }
}
</style>
