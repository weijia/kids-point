/**
 * zen-fs-config 初始化模板
 * --------------------------
 * 参考 my-skills/zen-fs-config/skill.md
 *
 * 设计原则：
 *  - IndexedDB 始终是本地主后端（offline-first），所有读写直接操作 IndexedDB
 *  - 远程后端（WebDAV / Gitee / S3 等）是副本，通过 addBackend() 添加后自动双向同步
 *  - 重新打开应用只需传入 appId，IndexedDB + .meta/backends/ 包含所有状态
 *  - 业务数据配置保存在 /kids-point/ 下的 JSON 文件中，通过 setConfig / getConfig 操作
 */

import {
  createConfigRepo,
  registerBackend,
  getBackendMetadata as _getBackendMetadata,
  listBackendMetadata as _listBackendMetadata,
  wrapZenFSFileSystem,
  type IConfigRepo,
  type BackendInstance,
  type ConflictArchive,
  type BackendDescriptor,
  type BackendsMeta,
  type BackendMetadata,
} from 'zen-fs-config'

const APP_ID = 'kids-point'
const IDB_STORE_NAME = 'kids-point-config'

let configRepo: IConfigRepo | null = null
let initPromise: Promise<IConfigRepo> | null = null

// ===========================================================================
// 一、注册自定义后端类型（必须在 createConfigRepo 之前调用）
// ===========================================================================

/**
 * 注册 WebDAV 后端。
 *
 * zen-fs-webdav 的 WebDAVFileSystem 方法签名与 zen-fs-config 需要的
 * BackendInstance 略有差异（readDir vs readdir / deleteFile vs unlink），
 * 这里做一层浅适配。
 */
function registerWebDAVBackend(): void {
  registerBackend(
    'WebDAV',
    async (options: Record<string, unknown>): Promise<BackendInstance> => {
      const { createWebDAVFileSystem } = await import('zen-fs-webdav')
      const tNum = Number(options.timeout)
      const webdav = createWebDAVFileSystem({
        baseUrl: options.baseUrl as string,
        username: options.username as string | undefined,
        password: options.password as string | undefined,
        token: options.token as string | undefined,
        timeout: Number.isFinite(tNum) && tNum > 0 ? tNum : undefined,
        headers: typeof options.headers === 'object' ? (options.headers as Record<string, string>) : undefined,
      })

      // 把各种 data 转换成 WebDAV writeFile 接受的类型
      const normalizeWriteData = (data: unknown): string | Uint8Array => {
        if (typeof data === 'string') return data
        if (data instanceof Uint8Array) return data
        if (data instanceof ArrayBuffer) return new Uint8Array(data)
        if (ArrayBuffer.isView(data)) {
          return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        }
        return JSON.stringify(data)
      }

      return {
        async readFile(path: string, ...args: any[]): Promise<any> {
          const encoding = typeof args[0] === 'string' ? args[0] : args[0]?.encoding
          const opts: any = encoding ? { encoding } : {}
          const result = await webdav.readFile(path, opts)
          // Buffer 在浏览器里不存在，zen-fs-webdav 在浏览器环境下返回的其实是 Uint8Array/string
          if (encoding && typeof result !== 'string') {
            return new TextDecoder(encoding).decode(result as Uint8Array)
          }
          return result
        },

        async writeFile(path: string, data: any, _options?: any): Promise<void> {
          await webdav.writeFile(path, normalizeWriteData(data) as any)
        },

        async readdir(path: string): Promise<string[]> {
          const entries = await webdav.readDir(path)
          return entries.map((e: any) => (typeof e === 'string' ? e : e.name))
        },

        async stat(path: string, ..._args: any[]): Promise<any> {
          return webdav.stat(path)
        },

        async exists(path: string): Promise<boolean> {
          return webdav.exists(path)
        },

        async mkdir(path: string, _options?: any): Promise<any> {
          return webdav.mkdir(path)
        },

        async unlink(path: string): Promise<void> {
          // WebDAVFileSystem 有 unlink(path) 和 deleteFile(path)，优先 deleteFile
          try {
            await webdav.unlink(path)
          } catch {
            await webdav.deleteFile(path)
          }
        },

        async rmdir(path: string): Promise<void> {
          await webdav.rmdir(path, { recursive: true })
        },

        async rename(oldPath: string, newPath: string): Promise<void> {
          await webdav.move(oldPath, newPath, true)
        },
      }
    },
    // BackendMetadata：用于 AdminPanel 动态表单生成
    {
      type: 'WebDAV',
      label: 'WebDAV',
      icon: '🌐',
      accountFields: ['username', 'password', 'token'],
      fields: [
        {
          key: 'baseUrl',
          label: '服务器地址',
          type: 'text',
          placeholder: 'https://dav.example.com/remote.php/dav/files/user/',
          required: true,
        },
        {
          key: 'username',
          label: '用户名',
          type: 'text',
          placeholder: '可选',
          required: false,
        },
        {
          key: 'password',
          label: '密码',
          type: 'password',
          placeholder: '可选，或使用 Token',
          required: false,
        },
        {
          key: 'token',
          label: 'Token',
          type: 'password',
          placeholder: '可选，优先于密码',
          required: false,
        },
      ],
      defaultOptions: {
        baseUrl: '',
        username: '',
        password: '',
        token: '',
      },
    },
  )
}

// 注册其他后端类型（以后新增 S3 可以在这里继续 registerBackend）
function registerGiteeBackend(): void {
  registerBackend(
    'Gitee',
    async (options: Record<string, unknown>): Promise<BackendInstance> => {
      const { default: Gitee } = await import('zen-fs-gitee')
      // 通过 wrapZenFSFileSystem 调用 resolveMountConfig + 自动 ready，
      // 把 ZenFS Backend<GiteeFS, GiteeOptions> 转换成 BackendInstance。
      return wrapZenFSFileSystem({
        backend: Gitee,
        token: options.token as string,
        owner: options.owner as string,
        repo: options.repo as string,
        branch: (options.branch as string) || 'master',
        baseUrl: options.baseUrl as string | undefined,
        disableAsyncCache: typeof options.disableAsyncCache === 'boolean' ? options.disableAsyncCache : false,
      } as any)
    },
    {
      type: 'Gitee',
      label: 'Gitee 仓库',
      icon: '🐙',
      accountFields: ['token'],
      fields: [
        {
          key: 'token',
          label: '个人访问令牌 (PAT)',
          type: 'password',
          placeholder: 'https://gitee.com/profile/personal_access_tokens 申请',
          required: true,
        },
        {
          key: 'owner',
          label: '仓库所有者 (用户名/组织)',
          type: 'text',
          placeholder: '例如 weijia',
          required: true,
        },
        {
          key: 'repo',
          label: '仓库名称',
          type: 'text',
          placeholder: '例如 my-data',
          required: true,
        },
        {
          key: 'branch',
          label: '分支',
          type: 'text',
          placeholder: '默认 master',
          required: false,
        },
        {
          key: 'baseUrl',
          label: '自定义 API 地址',
          type: 'text',
          placeholder: '默认 https://gitee.com/api/v5',
          required: false,
        },
      ],
      defaultOptions: {
        token: '',
        owner: '',
        repo: '',
        branch: 'master',
        baseUrl: 'https://gitee.com/api/v5',
      },
    },
  )
}

/**
 * 注册 RemoteStorage.js 后端。
 *
 * RemoteStorageFileSystem extends @zenfs/core FileSystem，方法名与 zen-fs
 * 一致但 readFile 返回 Uint8Array / stat 返回 InodeLike，这里做一层
 * BackendInstance 浅适配。
 */
function registerRemoteStorageBackend(): void {
  registerBackend(
    'RemoteStorage',
    async (options: Record<string, unknown>): Promise<BackendInstance> => {
      const { createRemoteStorageFileSystem } = await import('zen-fs-remotestoragejs')
      const timeoutNum = Number(options.timeout)
      const rs = createRemoteStorageFileSystem({
        href: options.href as string,
        token: options.token as string,
        basePath: options.basePath as string | undefined,
        headers: typeof options.headers === 'object' ? (options.headers as Record<string, string>) : undefined,
        timeout: Number.isFinite(timeoutNum) && timeoutNum > 0 ? timeoutNum : undefined,
        preciseMtime: typeof options.preciseMtime === 'boolean' ? options.preciseMtime : undefined,
        persistCache: typeof options.persistCache === 'boolean' ? options.persistCache : undefined,
        syncRootPath: options.syncRootPath as string | undefined,
      })

      const normalizeWriteData = (data: unknown): string | Uint8Array => {
        if (typeof data === 'string') return data
        if (data instanceof Uint8Array) return data
        if (data instanceof ArrayBuffer) return new Uint8Array(data)
        if (ArrayBuffer.isView(data)) {
          return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        }
        return JSON.stringify(data)
      }

      // RemoteStorageFile readFile -> Uint8Array；BackendInstance 读 text 时需要转 string
      const readFileAsText = (bytes: Uint8Array, encoding?: string): string => {
        if (encoding && encoding.toLowerCase() === 'utf-16le') {
          return new TextDecoder(encoding as any).decode(bytes)
        }
        // 默认 utf-8
        return new TextDecoder().decode(bytes)
      }

      return {
        async readFile(path: string, ...args: any[]): Promise<any> {
          const encoding = typeof args[0] === 'string' ? args[0] : args[0]?.encoding
          const bytes = await rs.readFile(path)
          if (encoding) {
            return readFileAsText(bytes, encoding)
          }
          return bytes
        },

        async writeFile(path: string, data: any, _options?: any): Promise<void> {
          await rs.writeFile(path, normalizeWriteData(data))
        },

        async readdir(path: string): Promise<string[]> {
          return rs.readdir(path)
        },

        async stat(path: string, ..._args: any[]): Promise<any> {
          return rs.stat(path)
        },

        async exists(path: string): Promise<boolean> {
          return rs.exists(path)
        },

        async mkdir(path: string, _options?: any): Promise<any> {
          return rs.mkdir(path)
        },

        async unlink(path: string): Promise<void> {
          await rs.unlink(path)
        },

        async rmdir(path: string): Promise<void> {
          await rs.rmdir(path)
        },

        async rename(oldPath: string, newPath: string): Promise<void> {
          await rs.rename(oldPath, newPath)
        },

        async getRevision(path: string): Promise<string | number | undefined> {
          try {
            return rs.getRevision(path)
          } catch {
            return undefined
          }
        },

        async dispose(): Promise<void> {
          try {
            await rs.disconnect()
          } catch {
            /* noop */
          }
        },
      }
    },
    {
      type: 'RemoteStorage',
      label: 'RemoteStorage.js',
      icon: '📡',
      accountFields: ['token'],
      fields: [
        {
          key: 'href',
          label: 'Storage 端点 URL',
          type: 'text',
          placeholder: 'https://5apps.com/storage/username/ 或自托管实例',
          required: true,
        },
        {
          key: 'token',
          label: 'Bearer Token',
          type: 'password',
          placeholder: '通过 WebOAuth / claimAccess 拿到的模块级 token',
          required: true,
        },
        {
          key: 'basePath',
          label: '基础路径',
          type: 'text',
          placeholder: '例如 /app_data/ 或 /public/',
          required: false,
        },
        {
          key: 'syncRootPath',
          label: '同步基线路径',
          type: 'text',
          placeholder: '默认 basePath 为空时用 app_data/，避免 401',
          required: false,
        },
        {
          key: 'timeout',
          label: '请求超时 (ms)',
          type: 'text',
          placeholder: '默认 30000',
          required: false,
        },
      ],
      defaultOptions: {
        href: '',
        token: '',
        basePath: '',
        syncRootPath: '',
        timeout: '30000',
      },
    },
  )
}

function registerAllBackends(): void {
  registerWebDAVBackend()
  registerGiteeBackend()
  registerRemoteStorageBackend()
}

// ===========================================================================
// 二、初始化 ConfigRepo
// ===========================================================================

export async function initConfig(): Promise<IConfigRepo> {
  if (configRepo) {
    return configRepo
  }
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    // 1. 注册所有自定义后端（必须在 createConfigRepo 之前）
    registerAllBackends()

    // 2. 零参数初始化（offline-first）：
    //    - 自动创建 IndexedDB 主后端（storeName: kids-point-config）
    //    - 自动 load() 缓存，读取已有的副本后端 .meta/backends/*.json
    //    - 自动建立已注册副本后端的双向同步
    const repo = await createConfigRepo(APP_ID, {
      idbStoreName: IDB_STORE_NAME,
      // 默认用 IdbCacheStore：缓存副本后端的响应 + revision，跨 reload 持续
      cache: { storeType: 'IdbCacheStore', storePrefix: 'zen-fs-config:' },
      // 30 分钟轮询一次远程副本（用户可手动 flush 立即同步）
      syncPollIntervalMs: 30 * 60 * 1000,
    })

    // 3. 标记为 config-sync 组（业务程序的"配置同步"，不是 data-sync）
    await repo.ensureGroupType('config-sync')

    configRepo = repo
    return repo
  })()

  return initPromise
}

export function getConfigRepo(): IConfigRepo {
  if (!configRepo) {
    throw new Error('Config repo not initialized. Call initConfig() first.')
  }
  return configRepo
}

export async function withConfig<T>(fn: (repo: IConfigRepo) => Promise<T> | T): Promise<T> {
  const repo = await initConfig()
  return fn(repo)
}

// ===========================================================================
// 三、管理辅助 API（给 AdminPanel 使用）
// ===========================================================================

/** 配置项条目（用在 UI 列表里） */
export interface ConfigEntry {
  /** 逻辑路径（例如 /settings，自动去掉 /{appId} 前缀和 .json 后缀） */
  path: string
  /** 实际文件字节数（近似，version 文件不计） */
  sizeBytes: number
  /** 解析出来的配置值（读取失败时为 null） */
  value: unknown
}

/** 递归列出所有配置文件 */
export async function listConfigEntries(prefix: string = '/'): Promise<ConfigEntry[]> {
  const repo = getConfigRepo()
  const appId = repo.appId
  const result: ConfigEntry[] = []

  const visit = async (dir: string) => {
    let entries: string[] = []
    try {
      entries = await (repo.rootFS.promises.readdir as any)(dir)
    } catch {
      return
    }
    for (const name of entries) {
      if (name.startsWith('.')) continue
      const fullPath = dir.endsWith('/') ? dir + name : dir + '/' + name
      let stat: any
      try {
        stat = await (repo.rootFS.promises.stat as any)(fullPath)
      } catch {
        continue
      }
      if (stat && typeof stat.isDirectory === 'function' ? stat.isDirectory() : stat.type === 'dir') {
        await visit(fullPath)
      } else if (stat && typeof stat.isFile === 'function' ? stat.isFile() : stat.type === 'file') {
        if (!name.endsWith('.json')) continue
        const relativePath = fullPath.replace(`/${appId}`, '').replace(/\.json$/, '')
        const sizeBytes = Number(stat.size) || 0
        let value: unknown = null
        try {
          value = repo.getConfig(relativePath)
        } catch {
          /* ignore */
        }
        result.push({ path: relativePath, sizeBytes, value })
      }
    }
  }

  const basePrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix
  await visit(`/${appId}${basePrefix}`)
  // shared 目录也一并扫出来（如果有）
  await visit(`/shared${basePrefix}`)
  return result
}

export interface SyncStatusInfo {
  path: string
  status: string
}

export async function getSyncStatuses(): Promise<SyncStatusInfo[]> {
  const repo = getConfigRepo()
  const map = repo.getSyncStatuses()
  const arr: SyncStatusInfo[] = []
  for (const [path, status] of map.entries()) {
    arr.push({ path, status: String(status) })
  }
  return arr
}

export async function flushSync() {
  const repo = getConfigRepo()
  return repo.flush()
}

export async function listConflicts(): Promise<ConflictArchive[]> {
  const repo = getConfigRepo()
  return repo.listConflicts()
}

export async function readConflictBackup(conflictId: string, side: 'source' | 'target' | 'resolved'): Promise<string> {
  const repo = getConfigRepo()
  return repo.readConflictBackup(conflictId, side)
}

export async function resolveConflict(conflictId: string, mergedContent: unknown): Promise<void> {
  const repo = getConfigRepo()
  await repo.resolveConflict(conflictId, mergedContent)
}

export interface ConfigRepoInfo {
  appId: string
  nodeId: string
  replicaCount: number
  idbStoreName: string
  groupType: string | null
}

export async function getConfigRepoInfo(): Promise<ConfigRepoInfo> {
  const repo = getConfigRepo()
  let groupType: string | null = null
  try {
    groupType = await repo.getGroupType()
  } catch {
    /* ignore */
  }
  return {
    appId: repo.appId,
    nodeId: repo.nodeId,
    replicaCount: (repo as any).replicaCount ?? 0,
    idbStoreName: IDB_STORE_NAME,
    groupType,
  }
}

// Re-export backend-metadata helpers (registered during initConfig)
export function getBackendMetadata(type: string): BackendMetadata | undefined {
  return _getBackendMetadata(type)
}

export function listBackendMetadata(): BackendMetadata[] {
  return _listBackendMetadata()
}

// Backend topology management (uses repo methods backed by .meta/backends/*.json)
export async function getBackends(): Promise<BackendDescriptor[]> {
  const repo = getConfigRepo()
  const meta = await repo.getBackends()
  if (!meta) return []
  return meta.backends
}

export async function addBackend(
  id: string,
  type: string,
  options: Record<string, unknown>,
  description?: string,
): Promise<void> {
  const repo = getConfigRepo()
  await repo.addBackend(id, type, options, description)
}

export async function removeBackend(id: string): Promise<void> {
  const repo = getConfigRepo()
  await repo.removeBackend(id)
}

/** Delete a config entry by logical path (writes tombstone for sync). */
export async function deleteConfigByPath(configPath: string): Promise<void> {
  const repo = getConfigRepo()
  await repo.deleteFile(configPath)
}

export type { BackendDescriptor, BackendsMeta, BackendMetadata }
