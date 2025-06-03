<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSettings } from '../../stores/settings'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettings()

const isMenuOpen = ref(false)

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
        <ul class="navbar-nav">
          <li class="nav-item" :class="{ 'active': isActive('Home') }">
            <router-link to="/" @click="closeMenu">🏠 Home</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Members') }">
            <router-link to="/members" @click="closeMenu">👨‍👩‍👧‍👦 Members</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Tasks') }">
            <router-link to="/tasks" @click="closeMenu">📝 Tasks</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Leaderboard') }">
            <router-link to="/leaderboard" @click="closeMenu">🏅 Leaderboard</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Store') }">
            <router-link to="/store" @click="closeMenu">🛍️ Store</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('Achievements') }">
            <router-link to="/achievements" @click="closeMenu">🎖️ Achievements</router-link>
          </li>
          <li class="nav-item" :class="{ 'active': isActive('AdminLogin') || isActive('AdminPanel') }">
            <router-link :to="isAuthenticated ? '/admin' : '/admin-login'" @click="closeMenu">
              🔒 {{ isAuthenticated ? 'Admin' : 'Parent Login' }}
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
  
  .navbar-nav {
    flex-direction: column;
  }
  
  .nav-item {
    margin: 0;
  }
  
  .nav-item a {
    padding: var(--space-md);
  }
}
</style>