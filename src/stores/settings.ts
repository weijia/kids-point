import { ref } from 'vue'

export interface Settings {
  adminPassword: string | null
  isAuthenticated: boolean
  lastDailyReset: number
  lastWeeklyReset: number
  notificationsEnabled: boolean
  theme: 'light' | 'dark'
}

export interface SettingsStore {
  settings: Settings
  isAuthenticated: boolean
  updateSettings: (data: Partial<Settings>) => void
  setAdminPassword: (password: string) => void
  login: (password: string) => boolean
  logout: () => void
  resetData: () => void
  loadSettings: () => void
  saveSettings: () => void
}

export function useSettings(): SettingsStore {
  const defaultSettings: Settings = {
    adminPassword: null,
    isAuthenticated: false,
    lastDailyReset: Date.now(),
    lastWeeklyReset: Date.now(),
    notificationsEnabled: true,
    theme: 'light'
  }
  
  const settings = ref<Settings>({ ...defaultSettings })

  // Load settings from localStorage
  const loadSettings = () => {
    const savedSettings = localStorage.getItem('kidpoints-settings')
    if (savedSettings) {
      settings.value = JSON.parse(savedSettings)
    }
  }

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('kidpoints-settings', JSON.stringify(settings.value))
  }

  // Update settings
  const updateSettings = (data: Partial<Settings>) => {
    settings.value = { ...settings.value, ...data }
    saveSettings()
  }

  // Set admin password
  const setAdminPassword = (password: string) => {
    // In a real app, you'd want to hash this password
    settings.value.adminPassword = password
    saveSettings()
  }

  // Authenticate
  const login = (password: string): boolean => {
    if (settings.value.adminPassword === password) {
      settings.value.isAuthenticated = true
      saveSettings()
      return true
    }
    return false
  }

  // Logout
  const logout = () => {
    settings.value.isAuthenticated = false
    saveSettings()
  }

  // Reset all data
  const resetData = () => {
    // Clear all data except settings
    localStorage.removeItem('kidpoints-members')
    localStorage.removeItem('kidpoints-tasks')
    localStorage.removeItem('kidpoints-rewards')
    localStorage.removeItem('kidpoints-achievements')
    
    // Reset settings to default (but keep the password)
    const currentPassword = settings.value.adminPassword
    settings.value = { 
      ...defaultSettings,
      adminPassword: currentPassword
    }
    saveSettings()
  }

  return {
    settings: settings.value,
    get isAuthenticated() { 
      return settings.value.isAuthenticated 
    },
    updateSettings,
    setAdminPassword,
    login,
    logout,
    resetData,
    loadSettings,
    saveSettings
  }
}