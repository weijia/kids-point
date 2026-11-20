/**
 * kids-point 数据服务。
 *
 * 链路（保留 PouchDB + universal-sync-v2，仅把落盘 fs 换成 zen-fs-config 数据组）：
 *   PouchDB(kidspoints) --universal-sync-v2--> 数据组 fs --SyncPair--> 后端
 *
 * 数据组实例由 config-ui 的 connected 事件解析后传入（live 引用），
 * 本服务不自建 repo，也不直连 WebDAV/Gitee/RemoteStorage。
 */
import PouchDB from 'pouchdb'
import type { AppDataGroup } from 'zen-fs-config'
import { sync } from 'universal-sync-v2'
import { adaptDataGroupFs } from './config-fs-adapter'
import { DATA_GROUP_BASE_PATH } from './config'

export interface DatabaseServiceConfig {
  /** 数据组内的同步根路径，默认 /kidspoints */
  basePath?: string
}

class DatabaseService {
  private db: PouchDB.Database | null = null
  private activeGroup: AppDataGroup | null = null
  private syncInProgress = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private onSyncStatusChange?: (status: SyncStatus) => void

  public async initialize(name: string = 'kidspoints'): Promise<PouchDB.Database> {
    if (this.db) return this.db
    this.db = new PouchDB(name)
    return this.db
  }

  public getDatabase(): PouchDB.Database | null {
    return this.db
  }

  /** config-ui 连上数据组后调用：保存 live 引用，并可选立即做一次初始双向同步 */
  public async attachDataGroup(group: AppDataGroup, autoSync = true): Promise<void> {
    this.activeGroup = group
    if (autoSync) await this.syncNow()
  }

  public detachDataGroup(): void {
    this.activeGroup = null
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  public isDataGroupReady(): boolean {
    return this.activeGroup !== null
  }

  public onStatusChange(callback: (status: SyncStatus) => void): void {
    this.onSyncStatusChange = callback
  }

  /** 立即同步（PouchDB ↔ 数据组 fs）。数据组未连接时返回 false。 */
  public async syncNow(): Promise<boolean> {
    if (!this.db || !this.activeGroup) return false
    if (this.syncInProgress) return false

    this.syncInProgress = true
    this.onSyncStatusChange?.('syncing')
    try {
      const fs = adaptDataGroupFs(this.activeGroup)
      await sync(this.db as any, fs as any, DATA_GROUP_BASE_PATH)
      this.onSyncStatusChange?.('synced')
      return true
    } catch (error) {
      console.error('[kids-point] 同步到数据组失败:', error)
      this.onSyncStatusChange?.('error')
      return false
    } finally {
      this.syncInProgress = false
    }
  }

  /** 数据写入后 debounce 触发同步；数据组未就绪时仅写本地库 */
  public scheduleSync(delay = 1500): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = null
      void this.syncNow()
    }, delay)
  }

  // ---- PouchDB CRUD（各 store 使用）----
  public async put<T extends { _id: string }>(doc: T): Promise<PouchDB.Core.Response> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.put(doc)
  }

  public async get<T extends object>(id: string): Promise<T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.get(id) as Promise<T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta>
  }

  public async remove(doc: PouchDB.Core.RemoveDocument): Promise<PouchDB.Core.Response> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.remove(doc)
  }

  public async allDocs<T extends object>(): Promise<PouchDB.Core.AllDocsResponse<T>> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.allDocs<T>({ include_docs: true })
  }

  public async bulkDocs<T extends { _id: string }>(docs: T[]): Promise<(PouchDB.Core.Response | PouchDB.Core.Error)[]> {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.bulkDocs(docs)
  }

  public async destroy(): Promise<void> {
    if (this.db) {
      await this.db.destroy()
      this.db = null
    }
    this.detachDataGroup()
  }
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export const databaseService = new DatabaseService()
export default databaseService
