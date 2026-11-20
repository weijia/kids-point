import { ref, watch } from 'vue'
import type { SupportedLocale } from '../i18n'
import { loadDoc, saveDoc } from '../services/doc-store'

export interface Settings {
  adminPassword: string | null
  isAuthenticated: boolean
  lastDailyReset: number
  lastWeeklyReset: number
  notificationsEnabled: boolean
  theme: 'light' | 'dark'
  locale: SupportedLocale
}

function getDefaultLocale(): SupportedLocale {
  const savedLocale = localStorage.getItem('kidpoints-locale')
  if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh')) {
    return savedLocale
  }
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) return 'zh'
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
    locale: getDefaultLocale()
  }
}

const settings = ref<Settings>(getDefaultSettings())
let initialized = false

const loadSettings = async () => {
  try {
    const saved = await loadDoc<Partial<Settings>>('settings')
    if (saved) {
      settings.value = {
        ...getDefaultSettings(),
        ...saved,
        // 登录态不跨设备同步，始终从登出状态开始
        isAuthenticated: false,
        locale: (saved.locale as SupportedLocale) || getDefaultLocale()
      }
    }
  } catch (e) {
    console.warn('Failed to load settings from PouchDB:', e)
  }
  initialized = true
}

watch(settings, () => {
  if (initialized) void saveDoc('settings', settings.value)
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
    const paths = ['members', 'tasks', 'rewards', 'achievements', 'violation-rules', 'violation-records', 'current-member']
    for (const path of paths) {
      try {
        await saveDoc(path, [])
      } catch (e) {
        console.warn(`Failed to reset ${path}:`, e)
      }
    }
    const currentPassword = settings.value.adminPassword
    const locale = settings.value.locale
    settings.value = {
      ...getDefaultSettings(),
      adminPassword: currentPassword,
      locale
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
    ensureLoaded,
    setLocale
  }
}
