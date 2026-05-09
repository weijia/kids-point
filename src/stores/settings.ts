import { ref } from 'vue'

export interface WebDAVSyncConfig {
  url: string
  username: string
  password: string
  enabled: boolean
  lastSyncTime: number | null
}

export interface Settings {
  adminPassword: string | null
  isAuthenticated: boolean
  lastDailyReset: number
  lastWeeklyReset: number
  notificationsEnabled: boolean
  theme: 'light' | 'dark'
  webdavSync: WebDAVSyncConfig | null
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
  configureWebDAV: (config: WebDAVSyncConfig) => void
  disableWebDAV: () => void
}

export function useSettings(): SettingsStore {
  const defaultSettings: Settings = {
    adminPassword: null,
    isAuthenticated: false,
    lastDailyReset: Date.now(),
    lastWeeklyReset: Date.now(),
    notificationsEnabled: true,
    theme: 'light',
    webdavSync: null
  }
  
  const settings = ref<Settings>({ ...defaultSettings })

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('kidpoints-settings')
    if (savedSettings) {
      settings.value = JSON.parse(savedSettings)
    }
  }

  const saveSettings = () => {
    localStorage.setItem('kidpoints-settings', JSON.stringify(settings.value))
  }

  const updateSettings = (data: Partial<Settings>) => {
    settings.value = { ...settings.value, ...data }
    saveSettings()
  }

  const setAdminPassword = (password: string) => {
    settings.value.adminPassword = password
    saveSettings()
  }

  const login = (password: string): boolean => {
    if (settings.value.adminPassword === password) {
      settings.value.isAuthenticated = true
      saveSettings()
      return true
    }
    return false
  }

  const logout = () => {
    settings.value.isAuthenticated = false
    saveSettings()
  }

  const resetData = () => {
    localStorage.removeItem('kidpoints-members')
    localStorage.removeItem('kidpoints-tasks')
    localStorage.removeItem('kidpoints-rewards')
    localStorage.removeItem('kidpoints-achievements')
    
    const currentPassword = settings.value.adminPassword
    const webdavSync = settings.value.webdavSync
    settings.value = { 
      ...defaultSettings,
      adminPassword: currentPassword,
      webdavSync
    }
    saveSettings()
  }

  const configureWebDAV = (config: WebDAVSyncConfig) => {
    settings.value.webdavSync = config
    saveSettings()
  }

  const disableWebDAV = () => {
    if (settings.value.webdavSync) {
      settings.value.webdavSync.enabled = false
      saveSettings()
    }
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
    saveSettings,
    configureWebDAV,
    disableWebDAV
  }
}
