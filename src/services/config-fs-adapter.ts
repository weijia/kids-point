/**
 * 把 zen-fs-config 数据组的文件视图（group.fs.promises）适配成
 * universal-sync-v2 需要的 IFileSystem。
 *
 * 链路：PouchDB(kidspoints) --universal-sync-v2--> 数据组 fs --SyncPair--> 后端
 *
 * 与直接用 createWebDAVFileSystem 的差异：
 *  - 数据组 fs 是 chroot 视图，异步 API 在 .promises 上；
 *  - stat 返回 { mode, size, mtimeMs }，IFileSystem 需要 { isFile(), isDirectory(), mtime, size }；
 *    目录判定用 mode & 0o40000（S_IFDIR），与 zen-fs-config 内部一致；
 *  - universal-sync-v2 读文件固定传 'utf8'，底层 BackendInstance 只认 'utf-8'，
 *    这里统一解码为 string，避免拿到 Uint8Array 导致 JSON.parse 失败。
 */
import type { AppDataGroup } from 'zen-fs-config'

const S_IFDIR = 0o40000

export interface IFileSystem {
  readFile(path: string, encoding: string): Promise<string>
  writeFile(path: string, data: string): Promise<void>
  readdir(path: string): Promise<string[]>
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
  stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean; mtime: Date; size?: number }>
  unlink(path: string): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
  exists(path: string): Promise<boolean>
  rmdir?(path: string): Promise<void>
}

interface GroupPromisesFs {
  readFile(path: string, encoding?: string): Promise<any>
  writeFile(path: string, data: string | Uint8Array, options?: any): Promise<void>
  readdir(path: string): Promise<string[]>
  stat(path: string): Promise<{ mode?: number; size?: number; mtimeMs?: number }>
  mkdir(path: string, options?: any): Promise<any>
  unlink(path: string): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
  exists(path: string): Promise<boolean>
  rmdir?(path: string): Promise<void>
}

function normalizePath(p: string): string {
  const withSlash = p.startsWith('/') ? p : `/${p}`
  return withSlash.replace(/\/+/g, '/')
}

function decodeContent(data: any): string {
  if (typeof data === 'string') return data
  if (data instanceof Uint8Array) return new TextDecoder().decode(data)
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(data))
  return String(data)
}

/** group.fs.promises → universal-sync-v2 的 IFileSystem */
export function adaptDataGroupFs(group: AppDataGroup): IFileSystem {
  const p = (group as any).fs?.promises as GroupPromisesFs | undefined
  if (!p) throw new Error('数据组没有可用的 fs.promises，无法适配同步引擎')

  return {
    async readFile(path) {
      // 固定用 utf-8 读并解码；忽略上层传来的 'utf8'，避免底层拿到不识别的编码
      return decodeContent(await p.readFile(normalizePath(path), 'utf-8'))
    },
    async writeFile(path, data) {
      await p.writeFile(normalizePath(path), data)
    },
    async readdir(path) {
      const entries = await p.readdir(normalizePath(path))
      return entries.map((e: any) => (typeof e === 'string' ? e : String(e?.name ?? e)))
    },
    async mkdir(path, options) {
      const full = normalizePath(path)
      if (options?.recursive) {
        // 部分后端 mkdir 不认 recursive，逐级创建并忽略 EEXIST
        let cur = ''
        for (const part of full.split('/').filter(Boolean)) {
          cur += `/${part}`
          try {
            await p.mkdir(cur)
          } catch (e: any) {
            if (e?.code !== 'EEXIST' && !/exist/i.test(String(e?.message ?? e))) throw e
          }
        }
        return
      }
      await p.mkdir(full)
    },
    async stat(path) {
      const s = await p.stat(normalizePath(path))
      const mode = typeof s.mode === 'number' ? s.mode : 0
      const isDir = (mode & S_IFDIR) === S_IFDIR
      const size = typeof s.size === 'number' ? s.size : 0
      return {
        isFile: () => !isDir,
        isDirectory: () => isDir,
        mtime: new Date(typeof s.mtimeMs === 'number' ? s.mtimeMs : Date.now()),
        size,
      }
    },
    async unlink(path) {
      await p.unlink(normalizePath(path))
    },
    async rename(oldPath, newPath) {
      await p.rename(normalizePath(oldPath), normalizePath(newPath))
    },
    async exists(path) {
      return p.exists(normalizePath(path))
    },
    async rmdir(path) {
      if (p.rmdir) await p.rmdir(normalizePath(path))
    },
  }
}
