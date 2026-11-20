/**
 * zen-fs-config 后端注册 + 数据组解析。
 *
 * 配置面板由 zen-fs-config-ui 提供；它内部调用 connect() 并发出 connected 事件，
 * 本模块负责：
 *  1) 注册 RemoteStorage / Gitee / WebDAV 三种副本后端类型（否则 UI 表单为空）；
 *  2) 从 connected 事件里解析出可用的数据组 live 引用，交给 databaseService 驱动同步。
 *
 * 注册表是模块级全局，重复 register 同一 type 会覆盖；用 guard 保证只执行一次。
 * 注意 Vite 下动态 import 必须是字面量，否则打包后拿不到模块。
 */
import { registerBackend, connect, wrapZenFSFileSystem } from 'zen-fs-config'
import type { AppDataGroup } from 'zen-fs-config'

export const APP_ID = 'kids-point'
export const DATA_GROUP_BASE_PATH = '/kidspoints'

let registered = false

/** 本地后端类型：这类后端不跨设备同步，组里只有它们时不算「已连上可用数据组」。 */
const LOCAL_BACKEND_TYPES = new Set(['IndexedDB', 'InMemory', 'local-idb'])

function listGroupBackends(group: any): any[] {
  if (!group) return []
  const connected = typeof group.listBackends === 'function' ? group.listBackends() : []
  const declared = typeof group.listDeclaredBackends === 'function' ? group.listDeclaredBackends() : []
  return [...(connected || []), ...(declared || [])]
}

function hasRemoteBackend(group: any): boolean {
  return listGroupBackends(group).some((b) => b && !LOCAL_BACKEND_TYPES.has(b.type) && !LOCAL_BACKEND_TYPES.has(b.id))
}

/** 注册 WebDAV 后端（zen-fs-webdav 方法名与 BackendInstance 略有差异，做浅适配） */
function registerWebDAVBackend(): void {
  registerBackend(
    'WebDAV',
    async (options: Record<string, unknown>): Promise<any> => {
      const { createWebDAVFileSystem } = await import('zen-fs-webdav')
      const tNum = Number(options.timeout)
      const webdav = createWebDAVFileSystem({
        baseUrl: options.baseUrl as string,
        username: options.username as string | undefined,
        password: options.password as string | undefined,
        token: options.token as string | undefined,
        timeout: Number.isFinite(tNum) && tNum > 0 ? tNum : undefined,
      } as any)

      const normalizeWriteData = (data: unknown): string | Uint8Array => {
        if (typeof data === 'string') return data
        if (data instanceof Uint8Array) return data
        if (data instanceof ArrayBuffer) return new Uint8Array(data)
        if (ArrayBuffer.isView(data)) {
          return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        }
        return JSON.stringify(data)
      }

      const fs: any = webdav as any
      return {
        async readFile(path: string, ...args: any[]): Promise<any> {
          const encoding = typeof args[0] === 'string' ? args[0] : args[0]?.encoding
          // 底层只认 'utf-8'；'utf8' 会返回 Uint8Array，统一转成 string
          const result = await fs.readFile(path, encoding ? { encoding: 'utf-8' } : {})
          if (typeof result === 'string') return result
          if (result instanceof Uint8Array) return new TextDecoder().decode(result)
          return result
        },
        async writeFile(path: string, data: any): Promise<void> {
          await fs.writeFile(path, normalizeWriteData(data))
        },
        async readdir(path: string): Promise<string[]> {
          const entries = await (fs.readdir ? fs.readdir(path) : fs.readDir(path))
          return entries.map((e: any) => (typeof e === 'string' ? e : String(e.name ?? e)))
        },
        async stat(path: string, ..._args: any[]): Promise<any> {
          return fs.stat(path)
        },
        async exists(path: string): Promise<boolean> {
          return fs.exists(path)
        },
        async mkdir(path: string, _options?: any): Promise<any> {
          return fs.mkdir(path)
        },
        async unlink(path: string): Promise<void> {
          if (typeof fs.unlink === 'function') await fs.unlink(path)
          else await fs.deleteFile(path)
        },
        async rmdir(path: string): Promise<void> {
          await fs.rmdir(path, { recursive: true })
        },
        async rename(oldPath: string, newPath: string): Promise<void> {
          await fs.move(oldPath, newPath, true)
        },
      }
    },
    {
      type: 'WebDAV',
      label: 'WebDAV',
      icon: '🌐',
      accountFields: ['username', 'password', 'token'],
      fields: [
        { key: 'baseUrl', label: '服务器地址', type: 'text', required: true },
        { key: 'username', label: '用户名', type: 'text', required: false },
        { key: 'password', label: '密码', type: 'password', required: false },
        { key: 'token', label: 'Token', type: 'password', required: false },
      ],
      defaultOptions: { baseUrl: '', username: '', password: '', token: '' },
    },
  )
}

/** 注册 RemoteStorage 后端（直接返回 Ctor 实例，不要再用 wrapZenFSFileSystem 包一层） */
function registerRemoteStorageBackend(): void {
  registerBackend(
    'RemoteStorage',
    async (options: Record<string, unknown>): Promise<any> => {
      const rs = await import('zen-fs-remotestoragejs')
      const Ctor = (rs as any).RemoteStorageFileSystem || (rs as any).default
      if (typeof Ctor !== 'function') throw new Error('zen-fs-remotestoragejs 未导出 RemoteStorageFileSystem')
      const rawHref = String(options.href ?? '')
      const token = String(options.token ?? '')
      if (!rawHref || !token) throw new Error('RemoteStorage 后端需要 href 与 token')
      let href = rawHref.replace(/\/$/, '')
      if (!/^https?:\/\//.test(href)) {
        const at = href.lastIndexOf('@')
        if (at < 0) throw new Error(`RemoteStorage 地址无效：${href}（应为 URL 或 user@host）`)
        const user = href.slice(0, at)
        const host = href.slice(at + 1)
        const res = await fetch(`https://${host}/.well-known/webfinger?resource=acct:${user}@${host}`, {
          headers: { Accept: 'application/json' },
          credentials: 'omit',
        })
        if (!res.ok) throw new Error(`WebFinger 解析失败：${res.status}`)
        const links: any[] = (await res.json()).links || []
        const link = links.find((l) =>
          l?.rel === 'http://remotestorage.io/spec/version' ||
          l?.rel === 'remotestorage' ||
          l?.rel === 'http://tools.ietf.org/id/draft-dejong-remotestorage',
        )
        if (!link?.href) throw new Error('WebFinger 响应中没有 RemoteStorage 存储地址')
        href = link.href.replace(/\/$/, '')
      }
      return new Ctor({
        href,
        token,
        basePath: (options.basePath as string) || undefined,
        preciseMtime: true,
        persistCache: true,
      })
    },
    {
      type: 'RemoteStorage',
      label: 'RemoteStorage.js',
      icon: '📡',
      accountFields: ['token'],
      fields: [
        { key: 'href', label: '存储地址 (URL 或 user@host)', type: 'text', required: true },
        { key: 'token', label: 'Bearer token', type: 'password', required: true },
        { key: 'basePath', label: '基准路径 (可选)', type: 'text' },
      ],
      defaultOptions: { href: '', token: '', basePath: '' },
      identityFields: ['href', 'basePath'],
    },
  )
}

/** 注册 Gitee 后端（字面量 import 让 Vite 能静态分析） */
function registerGiteeBackend(): void {
  registerBackend(
    'Gitee',
    async (options: Record<string, unknown>): Promise<any> => {
      const mod: any = await import('zen-fs-gitee')
      const Gitee = mod?.Gitee ?? mod?.default
      if (!Gitee || (typeof Gitee !== 'function' && typeof Gitee.create !== 'function')) {
        throw new Error('zen-fs-gitee 未导出可用的 Gitee 后端')
      }
      return wrapZenFSFileSystem({
        backend: Gitee,
        token: options.token as string,
        owner: options.owner as string,
        repo: options.repo as string,
        branch: (options.branch as string) || 'master',
        baseUrl: (options.baseUrl as string) || undefined,
      } as any)
    },
    {
      type: 'Gitee',
      label: 'Gitee 仓库',
      icon: '🐙',
      accountFields: ['token', 'owner'],
      fields: [
        { key: 'owner', label: 'Owner', type: 'text', required: true },
        { key: 'repo', label: 'Repo', type: 'text', required: true },
        { key: 'branch', label: 'Branch', type: 'text' },
        { key: 'token', label: 'Token', type: 'password' },
      ],
      defaultOptions: { owner: '', repo: '', branch: 'master', token: '' },
      identityFields: ['owner', 'repo', 'branch'],
    },
  )
}

/** 幂等注册所有后端类型，必须在 config-ui 挂载前调用 */
export function registerSyncBackends(): void {
  if (registered) return
  registered = true
  registerWebDAVBackend()
  registerRemoteStorageBackend()
  registerGiteeBackend()
}

/**
 * 从 config-ui 的 connected 事件里解析可用的数据组实例。
 * - data-sync 模式直接给 dataGroup；
 * - config-sync 模式需遍历 repo.listAppDataGroups() → getAppDataGroup()；
 * - 再兜底 connect(appId)。
 * 多个候选时优先带远端后端的组，避免误选纯本地空组。
 */
export async function resolveDataGroup(connected: any): Promise<AppDataGroup | null> {
  const direct = connected?.dataGroup as AppDataGroup | undefined
  if (direct?.fs?.promises) return direct

  const candidates: AppDataGroup[] = []
  const repo = connected?.repo as any
  if (repo?.listAppDataGroups && repo?.getAppDataGroup) {
    try {
      const descriptors = await repo.listAppDataGroups()
      for (const d of descriptors) {
        const g = await repo.getAppDataGroup(d.id)
        if (g?.fs?.promises) candidates.push(g)
      }
    } catch (e) {
      console.warn('[kids-point] 从 repo 解析数据组失败:', e)
    }
  }
  if (candidates.length === 0) {
    try {
      const result = await connect(APP_ID)
      for (const g of result.appDataGroups || []) {
        if (g?.fs?.promises) candidates.push(g)
      }
    } catch (e) {
      console.warn('[kids-point] connect 兜底解析数据组失败:', e)
    }
  }
  if (candidates.length === 0) return null
  return candidates.find((g) => hasRemoteBackend(g)) ?? candidates[0]
}
