import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import Particles from 'vue3-particles'
import App from './App.vue'
import './style.css'
import './styles/main.css'
import { i18n } from './i18n'

import { routes } from './router'

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

const app = createApp(App)

app.use(router)
app.use(i18n)
app.use(Particles)
app.mount('#app')
