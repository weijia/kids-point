import { createConfigRepo, registerBackend, type IConfigRepo, type BackendInstance } from 'zen-fs-config'

let configRepo: IConfigRepo | null = null
let initPromise: Promise<IConfigRepo> | null = null

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
      registerBackend('IndexedDB', async (options) => {
        const fs = await IndexedDB.create(options as any)
        return fs as unknown as BackendInstance
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
        // 只处理 .json 文件
        if (!name.endsWith('.json')) continue
        // 转换为配置路径：去掉 /{appId} 前缀和 .json 后缀
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
  // 通过读取 .meta/backends.json 获取后端信息
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
