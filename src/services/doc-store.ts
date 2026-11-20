/**
 * PouchDB 单文档读写 helper。
 *
 * 各 store 原来用 repo.getConfig/setConfig 存整组数据；改回 PouchDB 后，
 * 每个逻辑分组对应一个文档（_id = 分组名，value = 原数据）。
 * 读写做 per-id 串行化并缓存 _rev，避免 deep watch 连续触发时发生 409 冲突。
 * 每次写入后触发 databaseService.scheduleSync()，把变更同步到数据组 fs。
 */
import databaseService from './database'

const revCache = new Map<string, string>()
const queues = new Map<string, Promise<void>>()

export async function loadDoc<T>(id: string): Promise<T | null> {
  try {
    const doc = await databaseService.get<{ value: T }>(id)
    revCache.set(id, doc._rev)
    return doc.value
  } catch (e: any) {
    if (e?.status === 404) return null
    throw e
  }
}

export async function saveDoc<T>(id: string, value: T): Promise<void> {
  const prev = queues.get(id) ?? Promise.resolve()
  const task = prev.catch(() => undefined).then(async () => {
    let rev = revCache.get(id)
    if (!rev) {
      try {
        rev = (await databaseService.get(id))._rev
      } catch (e: any) {
        if (e?.status !== 404) throw e
      }
    }
    const doc: any = { _id: id, value }
    if (rev) doc._rev = rev
    const res = await databaseService.put(doc)
    revCache.set(id, res.rev)
    databaseService.scheduleSync()
  })
  queues.set(id, task)
  return task
}

export function clearDocCache(id?: string): void {
  if (id) {
    revCache.delete(id)
    queues.delete(id)
  } else {
    revCache.clear()
    queues.clear()
  }
}
