// 由 vite.config.ts 的 define 在构建时注入，
// 在浏览器中会被直接替换为对应的 JSON.stringified 字面量
declare const __APP_VERSION__: string
declare const __APP_BUILD_TIME__: string
declare const __APP_COMMIT_SHA__: string

const rawVersion: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''
const rawBuildTime: string = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : ''
const rawCommitSha: string = typeof __APP_COMMIT_SHA__ !== 'undefined' ? __APP_COMMIT_SHA__ : ''

export const VERSION = rawVersion || 'dev'
export const BUILD_TIME = rawBuildTime
export const COMMIT_SHA = rawCommitSha

const isDev = VERSION === 'dev' && !COMMIT_SHA && !BUILD_TIME

export const versionDisplay = !isDev && VERSION !== 'dev' ? VERSION : '开发版'
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

/**
 * 用于更新提示 Toast 的完整版本信息（版本号 + commit + 构建时间）。
 * 新版本发布后，用户在 PWA "新版本可用" Toast 里能直接看到自己升级到了什么构建。
 */
export function formatVersionFull(): string {
  const main = formatVersion()
  const time = formatBuildTime()
  if (main === '开发版') {
    return time ? `开发版 · ${time}` : '开发版'
  }
  return time ? `${main} · ${time}` : main
}
