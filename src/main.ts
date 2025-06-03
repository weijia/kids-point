import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import Particles from 'vue3-particles'
import App from './App.vue'
import './styles/main.css'

// Import routes
import { routes } from './router'

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Create and mount app
const app = createApp(App)
app.use(router)
app.use(Particles)
app.mount('#app')