import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import { APP_NAMESPACE } from '../appNamespace'
import { toSessionSummary, type Session, type SessionSummary } from './types'

/**
 * 新库从 v1 起步，只有会话、摘要、原件；不含导入暂存（导入导出已移除）。
 * 库名由 `APP_NAMESPACE` 派生，不在这里写死。
 *
 * @see APP_NAMESPACE 命名空间的唯一来源
 * @see CHANGELOGS.md（P2-01）库结构决策
 */
const DB_NAME = APP_NAMESPACE
const DB_VERSION = 1

/**
 * 文件原件按附件的本地 id 存储，所有引用同一 id 的消息共用一份；用于缩略图、打开查看，以及没有 serverId 时补传。
 *
 * @see FileAttachment.id 附件 id 的定义
 */
export type StoredFile = {
  /** 附件本地 id（对应 `FileAttachment.id`） */
  id: string
  /** 原件二进制 */
  blob: Blob
}

/** 文件引用留在摘要中，删除会话时通过索引判断原件是否仍被引用。 */
type StoredSessionSummary = SessionSummary & {
  /** 该会话引用的附件 id，用于删除时判断原件是否仍被引用 */
  fileIds: string[]
}

/**
 * 本地库结构：会话详情、会话摘要、附件原件。
 *
 * @see Session / SessionSummary 由 `chat/types.ts` 定义
 * @see StoredFile 原件模型
 */
interface ChatDB extends DBSchema {
  /** 会话详情 */
  sessions: { key: string; value: Session }
  /** 会话摘要（列表用） */
  sessionSummaries: {
    /** 摘要主键，等于会话 id */
    key: string
    /** 摘要内容 */
    value: StoredSessionSummary
    /** 附件引用索引（multiEntry） */
    indexes: { fileIds: string }
  }
  /** 附件原件 */
  files: { key: string; value: StoredFile }
}

/** 从会话详情生成摘要（含附件引用）。 */
const storedSummary = (session: Session): StoredSessionSummary => ({
  ...toSessionSummary(session),
  fileIds: [...new Set(session.messages.flatMap((message) => (message.role === 'user' ? message.files.map((file) => file.id) : [])))],
})

/** 中止事务，忽略已中止的报错。 */
const abortTransaction = (tx: { abort(): void }) => {
  try {
    tx.abort()
  } catch {
    // 事务已因请求失败中止。
  }
}

/** 本地库的操作面；每个 Pinia 实例一份，连接缓存在闭包里，不写模块级可变全局。 */
export interface ChatDBHandle {
  /** 读取全部会话摘要（未排序）。 */
  loadSessionSummaries(): Promise<SessionSummary[]>
  /** 按 id 读取会话详情。 */
  loadSession(id: string): Promise<Session | undefined>
  /** 原子写入会话、摘要与附件原件。 */
  saveSession(session: Session, files?: StoredFile[]): Promise<void>
  /** 未打开的会话也可重命名：只读该会话，原子更新详情与列表。 */
  renameSession(id: string, title: string): Promise<void>
  /** 删除会话，仅清理已无会话引用的本地原件。 */
  deleteSession(sessionId: string): Promise<void>
  /** 清空全部本地会话、摘要与原件。 */
  clearAllSessions(): Promise<void>
  /** 批量写入附件原件。 */
  saveFiles(files: StoredFile[]): Promise<void>
  /** 按附件 id 读取原件。 */
  loadFile(id: string): Promise<Blob | undefined>
}

/**
 * 创建本地库句柄：连接 Promise 缓存在闭包里，打开失败时清空以便重试。
 * 每个操作拿到连接后立即开事务；IndexedDB 按创建顺序执行范围重叠的事务，读取总能看到之前的写入。
 */
export const createChatDB = (): ChatDBHandle => {
  let promise: Promise<IDBPDatabase<ChatDB>> | null = null

  /** 懒加载数据库连接；打开失败后清空缓存以便重试。 */
  const getDB = (): Promise<IDBPDatabase<ChatDB>> =>
    (promise ??= openDB<ChatDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, tx) {
        for (const name of ['sessions', 'files'] as const) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' })
          }
        }
        const summaries = db.objectStoreNames.contains('sessionSummaries') ? tx.objectStore('sessionSummaries') : db.createObjectStore('sessionSummaries', { keyPath: 'id' })
        if (!summaries.indexNames.contains('fileIds')) {
          summaries.createIndex('fileIds', 'fileIds', { multiEntry: true })
        }
      },
    }).catch((error: unknown) => {
      // 打开失败后允许界面重试，避免一直复用已拒绝的 Promise。
      promise = null
      throw error
    }))

  return {
    loadSessionSummaries: async () => (await (await getDB()).getAll('sessionSummaries')).map(toSessionSummary),

    loadSession: async (id) => (await getDB()).get('sessions', id),

    saveSession: async (session, files = []) => {
      const summary = storedSummary(session)
      const tx = (await getDB()).transaction(['sessions', 'sessionSummaries', 'files'], 'readwrite')
      await Promise.all([
        (async () => {
          try {
            for (const file of files) {
              await tx.objectStore('files').put(file)
            }
            await tx.objectStore('sessions').put(session)
            await tx.objectStore('sessionSummaries').put(summary)
          } catch (error) {
            abortTransaction(tx)
            throw error
          }
        })(),
        tx.done,
      ])
    },

    renameSession: async (id, title) => {
      const tx = (await getDB()).transaction(['sessions', 'sessionSummaries'], 'readwrite')
      await Promise.all([
        (async () => {
          try {
            const sessions = tx.objectStore('sessions')
            const session = await sessions.get(id)
            if (session) {
              session.title = title
              await sessions.put(session)
              await tx.objectStore('sessionSummaries').put(storedSummary(session))
            }
          } catch (error) {
            abortTransaction(tx)
            throw error
          }
        })(),
        tx.done,
      ])
    },

    deleteSession: async (sessionId) => {
      const tx = (await getDB()).transaction(['sessions', 'sessionSummaries', 'files'], 'readwrite')
      await Promise.all([
        (async () => {
          try {
            const summaries = tx.objectStore('sessionSummaries')
            const summary = await summaries.get(sessionId)
            await tx.objectStore('sessions').delete(sessionId)
            await summaries.delete(sessionId)
            for (const id of summary?.fileIds ?? []) {
              if ((await summaries.index('fileIds').count(id)) === 0) {
                await tx.objectStore('files').delete(id)
              }
            }
          } catch (error) {
            abortTransaction(tx)
            throw error
          }
        })(),
        tx.done,
      ])
    },

    clearAllSessions: async () => {
      const tx = (await getDB()).transaction(['sessions', 'sessionSummaries', 'files'], 'readwrite')
      await Promise.all([tx.objectStore('sessions').clear(), tx.objectStore('sessionSummaries').clear(), tx.objectStore('files').clear(), tx.done])
    },

    saveFiles: async (files) => {
      const tx = (await getDB()).transaction('files', 'readwrite')
      await Promise.all([...files.map((file) => tx.store.put(file)), tx.done])
    },

    loadFile: async (id) => (await (await getDB()).get('files', id))?.blob,
  }
}

/** 本地存储失败不打断对话，只在控制台留痕。 */
export const reportStorageError =
  (action: string) =>
  (error: unknown): void => {
    console.error(`[storage] ${action} failed`, error)
  }
