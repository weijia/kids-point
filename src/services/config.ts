import {
  createConfigRepo,
  registerBackend,
  type IConfigRepo,
  type BackendInstance,
} from 'zen-fs-config'

let configRepo: IConfigRepo | null = null
let initPromise: Promise<IConfigRepo> | null = null

/**
 * 把 @zenfs/dom 的 StoreFS 适配成 zen-fs-config 需要的 BackendInstance。
 *
 * StoreFS 只有低级 API（read/write/stat/readdir/mkdir/unlink 等），
 * 但 BackendInstance 需要 readFile/writeFile/exists 等高级 API。
 * 这里通过组合低级 API 实现高级语义。
 */
function adaptStoreFS(storeFS: any): BackendInstance {
  return {
    async readFile(path: string, ...args: any[]): Promise<any> {
      let stat: any
      try {
        stat = await storeFS.stat(path)
      } catch {
        const err = new Error(`ENOENT: no such file or directory, open '${path}'`)
        ;(err as any).code = 'ENOENT'
        throw err
      }
      const size = Number(stat.size) || 0
      if (size === 0) {
        const encoding = typeof args[0] === 'string' ? args[0] : args[0]?.encoding
        return encoding ? '' : new Uint8Array(0)
      }
      const buffer = new Uint8Array(size)
      await storeFS.read(path, buffer, 0, size)
      const encoding = typeof args[0] === 'string' ? args[0] : args[0]?.encoding
      if (encoding) {
        return new TextDecoder(encoding).decode(buffer)
      }
      return buffer
    },

    async writeFile(path: string, data: any, _options?: any): Promise<void> {
      // 文件不存在则创建
      try {
        await storeFS.stat(path)
      } catch {
        await storeFS.createFile(path, { mode: 0o666 })
      }
      let bytes: Uint8Array
      if (typeof data === 'string') {
        bytes = new TextEncoder().encode(data)
      } else if (data instanceof ArrayBuffer) {
        bytes = new Uint8Array(data)
      } else if (ArrayBuffer.isView(data)) {
        bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      } else {
        bytes = new Uint8Array(0)
      }
      await storeFS.write(path, bytes, 0)
    },

    async readdir(path: string): Promise<string[]> {
      return storeFS.readdir(path)
    },

    async stat(path: string, ..._args: any[]): Promise<any> {
      return storeFS.stat(path)
    },

    async exists(path: string): Promise<boolean> {
      try {
        await storeFS.stat(path)
        return true
      } catch {
        return false
      }
    },

    async mkdir(path: string, options?: any): Promise<any> {
      return storeFS.mkdir(path, options || { mode: 0o777 })
    },

    async unlink(path: string): Promise<void> {
      return storeFS.unlink(path)
    },

    async rmdir(path: string): Promise<void> {
      return storeFS.rmdir(path)
    },

    async rename(oldPath: string, newPath: string): Promise<void> {
      return storeFS.rename(oldPath, newPath)
    },
  }
}

export async function initConfig(): Promise<IConfigRepo> {
  if (configRepo) {
    return configRepo
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    let backendType = 'InMemory'
    let backendOptions: Record<string, unknown> = { label: 'kids-point-config' }

    try {
      const { IndexedDB } = await import('@zenfs/dom')
      // 注册适配器：把 StoreFS 包装成 BackendInstance
      registerBackend('IndexedDB', async (options) => {
        const storeName = (options?.storeName as string) || 'zen-fs-config'
        const storeFS = await IndexedDB.create({ storeName })
        return adaptStoreFS(storeFS)
      })
      backendType = 'IndexedDB'
      backendOptions = { storeName: 'kids-point-config' }
    } catch (e) {
      console.warn('IndexedDB backend not available, falling back to InMemory:', e)
    }

    const repo = await createConfigRepo('kids-point', {
      primaryBackendId: 'local',
      backendInfo: {
        type: backendType,
        options: backendOptions,
      },
      cache: {
        storeType: 'MemoryCacheStore',
        ttlMs: 60_000,
      },
    })

    await (repo as any).load()
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

export async function withConfig<T>(fn: (repo: IConfigRepo) => T): Promise<T> {
  const repo = await initConfig()
  return fn(repo)
}

/** 列出指定目录下的所有配置项（带值） */
export async function listConfigEntries(prefix: string = '/'): Promise<Array<{ path: string; value: unknown }>> {
  const repo = getConfigRepo()
  const result: Array<{ path: string; value: unknown }> = []
  const appId = repo.appId

  const visit = async (dir: string) => {
    let entries: string[] = []
    try {
      entries = await (repo.fs.promises.readdir as any)(dir)
    } catch {
      return
    }
    for (const name of entries) {
      if (name.startsWith('.')) continue
      const fullPath = dir.endsWith('/') ? dir + name : dir + '/' + name
      let stat: any
      try {
        stat = await (repo.fs.promises.stat as any)(fullPath)
      } catch {
        continue
      }
      if (stat && stat.isDirectory()) {
        await visit(fullPath)
      } else if (stat && stat.isFile()) {
        if (!name.endsWith('.json')) continue
        const relativePath = fullPath.replace(`/${appId}`, '').replace(/\.json$/, '')
        try {
          const value = repo.getConfig(relativePath)
          result.push({ path: relativePath, value })
        } catch {
          // 忽略读取失败的项
        }
      }
    }
  }

  await visit(`/${appId}${prefix.endsWith('/') ? prefix.slice(0, -1) : prefix}`)
  return result
}

export interface SyncStatusInfo {
  path: string
  status: string
}

export async function getSyncStatuses(): Promise<SyncStatusInfo[]> {
  const repo = getConfigRepo()
  const statuses = repo.getSyncStatuses()
  const result: SyncStatusInfo[] = []
  for (const [path, status] of statuses.entries()) {
    result.push({ path, status: String(status) })
  }
  return result
}

export async function flushSync(): Promise<void> {
  const repo = getConfigRepo()
  await repo.flush()
}

export async function listConflicts() {
  const repo = getConfigRepo()
  return repo.listConflicts()
}

export async function resolveConflict(conflictId: string, mergedContent: unknown): Promise<void> {
  const repo = getConfigRepo()
  await repo.resolveConflict(conflictId, mergedContent)
}

export interface ConfigRepoInfo {
  appId: string
  nodeId: string
  backendType: string
  backendOptions: Record<string, unknown>
}

export async function getConfigRepoInfo(): Promise<ConfigRepoInfo> {
  const repo = getConfigRepo()
  let backendType = 'unknown'
  let backendOptions: Record<string, unknown> = {}
  try {
    const raw = await (repo.fs.promises.readFile as any)('/.meta/backends.json', 'utf-8')
    const meta = JSON.parse(raw as string)
    if (meta && Array.isArray(meta.backends) && meta.backends.length > 0) {
      const primary = meta.backends[0]
      backendType = primary.type || 'unknown'
      backendOptions = primary.options || {}
    }
  } catch {
    // ignore
  }
  return {
    appId: repo.appId,
    nodeId: repo.nodeId,
    backendType,
    backendOptions,
  }
}
