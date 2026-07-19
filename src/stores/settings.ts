import { ref, watch } from 'vue'
import type { SupportedLocale } from '../i18n'
import { initConfig, getConfigRepo } from '../services/config'

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
  locale: SupportedLocale
}

function getDefaultLocale(): SupportedLocale {
  const savedLocale = localStorage.getItem('kidpoints-locale')
  if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh')) {
    return savedLocale
  }
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) {
    return 'zh'
  }
  return 'en'
}

function getDefaultSettings(): Settings {
  return {
    adminPassword: null,
    isAuthenticated: false,
    lastDailyReset: Date.now(),
    lastWeeklyReset: Date.now(),
    notificationsEnabled: true,
    theme: 'light',
    webdavSync: null,
    locale: getDefaultLocale()
  }
}

const settings = ref<Settings>(getDefaultSettings())
let initialized = false

const loadSettings = async () => {
  const repo = await initConfig()
  try {
    const saved = repo.getConfig<Partial<Settings>>('/settings')
    if (saved) {
      settings.value = {
        ...getDefaultSettings(),
        ...saved,
        locale: (saved.locale as SupportedLocale) || getDefaultLocale()
      }
    }
  } catch (e) {
    console.warn('Failed to load settings from config:', e)
    const savedSettings = localStorage.getItem('kidpoints-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        settings.value = { 
          ...getDefaultSettings(), 
          ...parsed,
          locale: parsed.locale || getDefaultLocale()
        }
      } catch (err) {
        console.error('Failed to parse settings from localStorage:', err)
      }
    }
  }
  initialized = true
}

const saveSettings = () => {
  if (!initialized) return
  try {
    const repo = getConfigRepo()
    repo.setConfig('/settings', settings.value)
  } catch (e) {
    console.warn('Failed to save settings to config, falling back to localStorage:', e)
    localStorage.setItem('kidpoints-settings', JSON.stringify(settings.value))
  }
}

watch(settings, () => {
  saveSettings()
}, { deep: true })

let loadPromise: Promise<void> | null = null

const ensureLoaded = (): Promise<void> => {
  if (initialized) return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = loadSettings()
  return loadPromise
}

export function useSettings() {
  const updateSettings = (data: Partial<Settings>) => {
    settings.value = { ...settings.value, ...data }
  }

  const setAdminPassword = (password: string) => {
    settings.value.adminPassword = password
  }

  const login = (password: string): boolean => {
    if (settings.value.adminPassword === password) {
      settings.value.isAuthenticated = true
      return true
    }
    return false
  }

  const logout = () => {
    settings.value.isAuthenticated = false
  }

  const resetData = async () => {
    const repo = await initConfig()
    const paths = ['/members', '/tasks', '/rewards', '/achievements', '/violation-rules', '/violation-records']
    for (const path of paths) {
      try {
        repo.setConfig(path, path.includes('violation') ? [] : [])
      } catch (e) {
        console.warn(`Failed to reset ${path}:`, e)
      }
    }
    
    localStorage.removeItem('kidpoints-members')
    localStorage.removeItem('kidpoints-tasks')
    localStorage.removeItem('kidpoints-rewards')
    localStorage.removeItem('kidpoints-achievements')
    
    const currentPassword = settings.value.adminPassword
    const webdavSync = settings.value.webdavSync
    const locale = settings.value.locale
    settings.value = { 
      ...getDefaultSettings(),
      adminPassword: currentPassword,
      webdavSync,
      locale
    }
  }

  const configureWebDAV = (config: WebDAVSyncConfig) => {
    settings.value.webdavSync = config
  }

  const disableWebDAV = () => {
    if (settings.value.webdavSync) {
      settings.value.webdavSync.enabled = false
    }
  }

  const setLocale = (locale: SupportedLocale) => {
    settings.value.locale = locale
    localStorage.setItem('kidpoints-locale', locale)
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
    loadSettings: ensureLoaded,
    saveSettings,
    configureWebDAV,
    disableWebDAV,
    setLocale,
    ensureLoaded
  }
}
