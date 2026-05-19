export const VERSION = import.meta.env.VITE_APP_VERSION || 'dev'
export const BUILD_TIME = import.meta.env.VITE_APP_BUILD_TIME || ''
export const COMMIT_SHA = import.meta.env.VITE_APP_COMMIT_SHA || ''

export const versionDisplay = VERSION !== 'dev' ? VERSION : '开发版'
export const buildTimeDisplay = BUILD_TIME ? new Date(BUILD_TIME).toLocaleString('zh-CN') : ''

export function formatVersion(): string {
  const parts: string[] = []
  
  if (VERSION !== 'dev') {
    parts.push(`v${VERSION}`)
  }
  
  if (COMMIT_SHA) {
    parts.push(`(${COMMIT_SHA})`)
  }
  
  return parts.length > 0 ? parts.join(' ') : '开发版'
}

export function formatBuildTime(): string {
  if (!BUILD_TIME) return ''
  return new Date(BUILD_TIME).toLocaleString('zh-CN')
}
