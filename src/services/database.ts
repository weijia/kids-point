import PouchDB from 'pouchdb';
import { sync } from 'universal-sync-v2';
import { createWebDAVFileSystem } from 'zen-fs-webdav';

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  syncPath?: string;
}

class DatabaseService {
  private db: PouchDB.Database | null = null;
  private webdavFS: ReturnType<typeof createWebDAVFileSystem> | null = null;
  private webdavConfig: WebDAVConfig | null = null;
  private syncInProgress = false;
  private onSyncStatusChange?: (status: SyncStatus) => void;

  public async initialize(name: string = 'kidspoints'): Promise<PouchDB.Database> {
    if (this.db) {
      return this.db;
    }

    this.db = new PouchDB(name);
    return this.db;
  }

  public async configureWebDAV(config: WebDAVConfig): Promise<void> {
    this.webdavConfig = config;
    
    try {
      this.webdavFS = createWebDAVFileSystem({
        baseUrl: config.url,
        username: config.username,
        password: config.password,
      });
    } catch (error) {
      console.error('Failed to configure WebDAV:', error);
      throw error;
    }
  }

  public getDatabase(): PouchDB.Database | null {
    return this.db;
  }

  public isWebDAVConfigured(): boolean {
    return this.webdavFS !== null;
  }

  public async syncToWebDAV(): Promise<void> {
    if (!this.db || !this.webdavFS || !this.webdavConfig) {
      throw new Error('Database or WebDAV not configured');
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    this.onSyncStatusChange?.('syncing');

    try {
      const syncPath = this.webdavConfig.syncPath || '/kidspoints-data';
      await sync(this.db, this.webdavFS as any, syncPath);
      this.onSyncStatusChange?.('synced');
      console.log('Sync to WebDAV completed successfully');
    } catch (error) {
      console.error('Sync to WebDAV failed:', error);
      this.onSyncStatusChange?.('error');
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  public async loadFromWebDAV(): Promise<void> {
    if (!this.db || !this.webdavFS || !this.webdavConfig) {
      throw new Error('Database or WebDAV not configured');
    }

    this.syncInProgress = true;
    this.onSyncStatusChange?.('syncing');

    try {
      const syncPath = this.webdavConfig.syncPath || '/kidspoints-data';
      await sync(this.db, this.webdavFS as any, syncPath);
      this.onSyncStatusChange?.('synced');
      console.log('Load from WebDAV completed successfully');
    } catch (error) {
      console.error('Load from WebDAV failed:', error);
      this.onSyncStatusChange?.('error');
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  public onStatusChange(callback: (status: SyncStatus) => void): void {
    this.onSyncStatusChange = callback;
  }

  public async put<T extends { _id: string }>(doc: T): Promise<PouchDB.Core.Response> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.put(doc);
  }

  public async get<T extends object>(id: string): Promise<T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.get(id) as Promise<T & PouchDB.Core.IdMeta & PouchDB.Core.GetMeta>;
  }

  public async remove(doc: PouchDB.Core.RemoveDocument): Promise<PouchDB.Core.Response> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.remove(doc);
  }

  public async allDocs<T extends object>(): Promise<PouchDB.Core.AllDocsResponse<T>> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.allDocs<T>({ include_docs: true });
  }

  public async bulkDocs<T extends { _id: string }>(docs: T[]): Promise<(PouchDB.Core.Response | PouchDB.Core.Error)[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.bulkDocs(docs);
  }

  public async destroy(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
    }
  }
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export const databaseService = new DatabaseService();
export default databaseService;
