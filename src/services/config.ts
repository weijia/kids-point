import {
  createConfigRepo,
  registerBackend,
  type IConfigRepo,
  type BackendInstance,
} from 'zen-fs-config'

let configRepo: IConfigRepo | null = null
let initPromise: Promise<IConfigRepo> | null = null

/**
 * 把 @zenfs/dom 的 IndexedDB 文件系统适配成 zen-fs-config 需要的 BackendInstance。
 *
 * zen-fs-config 0.1.3 已修复 InMemory 后端的适配（使用 configureSingle + fs.promises），
 * 但没有内置 IndexedDB 后端。这里用同样的方式包装 @zenfs/dom 的 IndexedDB。
 */
async function createIndexedDBBackend(options: Record<string, unknown>): Promise<BackendInstance> {
  const { IndexedDB } = await import('@zenfs/dom')
  const { configureSingle, fs } = await import('@zenfs/core')
  const storeName = (options.storeName as string) || 'zen-fs-config'
  await configureSingle({ backend: IndexedDB, storeName })
  const pfs = fs.promises

  return {
    async readFile(path: string, ...args: any[]): Promise<any> {
      if (args.length > 0) {
        return (pfs as any).readFile(path, ...args)
      }
      return (pfs as any).readFile(path)
    },
    async writeFile(path: string, data: any, options2?: any): Promise<void> {
      return (pfs as any).writeFile(path, data, options2)
    },
    async readdir(path: string): Promise<string[]> {
      const entries = await (pfs as any).readdir(path)
      return entries.map((e: any) => (typeof e === 'string' ? e : e.name))
    },
    async stat(path: string, ...args: any[]): Promise<any> {
      return (pfs as any).stat(path, ...args)
    },
    async exists(path: string): Promise<boolean> {
      try {
        await (pfs as any).stat(path)
        return true
      } catch {
        return false
      }
    },
    async mkdir(path: string, options2?: any): Promise<any> {
      return (pfs as any).mkdir(path, options2)
    },
    async unlink(path: string): Promise<void> {
      return (pfs as any).unlink(path)
    },
    async rmdir(path: string): Promise<void> {
      return (pfs as any).rmdir(path)
    },
    async rename(oldPath: string, newPath: string): Promise<void> {
      return (pfs as any).rename(oldPath, newPath)
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
      registerBackend('IndexedDB', createIndexedDBBackend)
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
