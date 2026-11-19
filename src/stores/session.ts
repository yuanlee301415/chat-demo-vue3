import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import { reportStorageError } from '../services/chat/db'
import { settleInterrupted } from '../services/chat/interrupted'
import { toSessionSummary, type Session, type SessionSummary } from '../services/chat/types'
import { useDraftsStore } from './drafts'
import { resetChatRuntime, useRuntimeStore } from './runtime'
import { useUiStore } from './ui'

/** 保留最近打开的详情；当前会话、生成中及尚未成功保存的会话不淘汰。 */
const SESSION_CACHE_LIMIT = 5

/** 按更新时间降序排序，不修改入参。 */
const sortSessions = (sessions: SessionSummary[]): SessionSummary[] => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)

/** 摘要元数据是否一致，用于判断列表顺序是否需要更新。 */
const sameSummary = (a: SessionSummary, b: SessionSummary): boolean => a.title === b.title && a.createdAt === b.createdAt && a.updatedAt === b.updatedAt

/** 删除对象里的某个键，返回新对象。 */
const omitKey = <T>(record: Record<string, T>, key: string): Record<string, T> => Object.fromEntries(Object.entries(record).filter(([item]) => item !== key))

/**
 * 会话列表与详情缓存。
 * 列表只存元数据、按 updatedAt 降序；详情按需加载进 LRU 缓存（上限 5），
 * 加载/保存失败按会话记录，供界面单独提示，不影响其他会话。
 *
 * @see Session / SessionSummary 数据模型
 * @see CHANGELOGS.md（P2-02）会话状态机决策
 */
export const useSessionStore = defineStore('session', () => {
  const { runtime } = useRuntimeStore()
  const db = runtime.db

  /** 删除全部进行中标记：避免连点重复清库。 */
  let deletingAll = false

  const ready = shallowRef(false)
  const initError = shallowRef(false)
  const sessions = shallowRef<SessionSummary[]>([])
  const sessionCache = shallowRef<Record<string, Session>>({})
  const sessionLoadErrors = shallowRef<Record<string, boolean>>({})
  const sessionSaveErrors = shallowRef<Record<string, boolean>>({})
  /** null 表示新对话（欢迎页） */
  const activeId = shallowRef<string | null>(null)

  /** 记录会话访问顺序，供 LRU 淘汰使用。 */
  const touch = (id: string) => {
    runtime.accessSequence += 1
    runtime.sessionAccess.set(id, runtime.accessSequence)
  }

  /** 超过缓存上限时淘汰最久未访问且可淘汰的会话。 */
  const trimSessionCache = () => {
    const ids = Object.keys(sessionCache.value)
    if (ids.length <= SESSION_CACHE_LIMIT) {
      return
    }
    const removable = ids
      .filter((id) => id !== activeId.value && !runtime.streaming.has(id) && !runtime.unsavedSessions.has(id) && !runtime.deletingSessions.has(id))
      .sort((a, b) => (runtime.sessionAccess.get(a) ?? 0) - (runtime.sessionAccess.get(b) ?? 0))
    const evicted = new Set(removable.slice(0, ids.length - SESSION_CACHE_LIMIT))
    if (evicted.size === 0) {
      return
    }
    for (const id of evicted) {
      runtime.sessionAccess.delete(id)
    }
    sessionCache.value = Object.fromEntries(Object.entries(sessionCache.value).filter(([id]) => !evicted.has(id)))
  }

  /** 落盘：成功后才清掉未保存标记；失败保留标记并记录，界面可提示重试。 */
  const persist = (id: string) => {
    const session = sessionCache.value[id]
    if (session === undefined) {
      return
    }
    runtime.unsavedSessions.add(id)
    if (runtime.deletingSessions.has(id)) {
      return
    }
    const files = runtime.pendingFiles.get(id)
    void db
      .saveSession(session, files ?? [])
      .then(() => {
        if (sessionCache.value[id] !== session) {
          return
        }
        if (runtime.pendingFiles.get(id) === files) {
          runtime.pendingFiles.delete(id)
        }
        runtime.unsavedSessions.delete(id)
        sessionSaveErrors.value = omitKey(sessionSaveErrors.value, id)
        trimSessionCache()
      })
      .catch((error: unknown) => {
        reportStorageError('save session')(error)
        if (sessionCache.value[id] !== undefined) {
          sessionSaveErrors.value = { ...sessionSaveErrors.value, [id]: true }
        }
      })
  }

  /** 重试所有落盘失败的会话；成功后退回正常状态。 */
  const retrySave = () => {
    for (const id of Object.keys(sessionSaveErrors.value)) {
      if (sessionSaveErrors.value[id] && sessionCache.value[id] !== undefined) {
        persist(id)
      }
    }
  }

  /** 初始化会话列表；并发调用共享同一次加载。 */
  const init = (): Promise<void> => {
    if (ready.value) {
      return Promise.resolve()
    }
    if (runtime.initTask !== undefined) {
      return runtime.initTask
    }
    runtime.initTask = (async () => {
      try {
        sessions.value = sortSessions(await db.loadSessionSummaries())
        initError.value = false
        ready.value = true
      } catch (error) {
        initError.value = true
        reportStorageError('read local sessions')(error)
      } finally {
        runtime.initTask = undefined
      }
    })()
    return runtime.initTask
  }

  /** 同一会话合并并发读取；已缓存的直接返回。 */
  const ensureLoaded = (id: string): Promise<void> => {
    if (sessionCache.value[id] !== undefined) {
      return Promise.resolve()
    }
    const pending = runtime.sessionLoads.get(id)
    if (pending !== undefined) {
      return pending.promise
    }
    sessionLoadErrors.value = { ...sessionLoadErrors.value, [id]: false }
    const load: { promise: Promise<void> } = { promise: Promise.resolve() }
    runtime.sessionLoads.set(id, load)
    load.promise = (async () => {
      try {
        const stored = await db.loadSession(id)
        if (runtime.sessionLoads.get(id) !== load) {
          return
        }
        const summary = sessions.value.find((item) => item.id === id)
        if (summary === undefined) {
          return
        }
        if (stored === undefined) {
          throw new Error(`Session ${id} is missing from local storage`)
        }
        // 读取期间可能已在列表重命名，保留最新元数据，不能让旧读取覆盖它。
        const loaded = sameSummary(stored, summary) ? stored : { ...stored, ...summary }
        // 上次关闭页面时未完成的回复，重新加载时按「已停止」收尾并落盘。
        const session = settleInterrupted(loaded)
        touch(id)
        sessionCache.value = { ...sessionCache.value, [id]: session }
        if (session !== loaded) {
          persist(id)
        }
        trimSessionCache()
      } catch (error) {
        if (runtime.sessionLoads.get(id) === load) {
          sessionLoadErrors.value = { ...sessionLoadErrors.value, [id]: true }
          reportStorageError('read session')(error)
        }
      } finally {
        if (runtime.sessionLoads.get(id) === load) {
          runtime.sessionLoads.delete(id)
        }
      }
    })()
    return load.promise
  }

  /** null 回到欢迎页；只改 activeId，旧的在途读取不会把界面切回去。 */
  const select = (id: string | null) => {
    if (id !== null && !sessions.value.some((session) => session.id === id)) {
      return
    }
    if (id !== null) {
      touch(id)
      activeId.value = id
      void ensureLoaded(id)
    } else {
      activeId.value = null
    }
    trimSessionCache()
  }

  /** 回到欢迎页：只清 activeId，不清详情缓存。 */
  const newChat = () => {
    activeId.value = null
    trimSessionCache()
  }

  /** 重命名：已加载走缓存 + 落盘，未加载只改摘要与 DB。 */
  const rename = (id: string, title: string) => {
    if (runtime.deletingSessions.has(id)) {
      return
    }
    const session = sessionCache.value[id]
    if (session !== undefined) {
      sessionCache.value = { ...sessionCache.value, [id]: { ...session, title } }
      sessions.value = sortSessions(sessions.value.map((summary) => (summary.id === id ? { ...toSessionSummary(session), title } : summary)))
      persist(id)
      return
    }
    sessions.value = sessions.value.map((summary) => (summary.id === id ? { ...summary, title } : summary))
    void db.renameSession(id, title).catch(reportStorageError('rename session'))
  }

  /**
   * 删除会话；本地原件仅在没有其他会话引用时清理（由 DB 层按 fileIds 索引判断）。
   * 等本会话的流收尾会在 `P2-04` 接入 stream store 后补上，当前还没有流式写入路径。
   */
  const remove = async (id: string): Promise<boolean> => {
    if (runtime.deletingSessions.has(id)) {
      return false
    }
    runtime.deletingSessions.add(id)
    try {
      // 先生成中的流停下来并等它落盘，再删库，避免删完又被在途写入。
      const handle = runtime.streaming.get(id)
      handle?.controller.abort()
      await handle?.done
      await db.deleteSession(id)
      runtime.sessionLoads.delete(id)
      runtime.sessionAccess.delete(id)
      runtime.unsavedSessions.delete(id)
      runtime.pendingFiles.delete(id)
      sessions.value = sessions.value.filter((session) => session.id !== id)
      sessionCache.value = omitKey(sessionCache.value, id)
      sessionLoadErrors.value = omitKey(sessionLoadErrors.value, id)
      sessionSaveErrors.value = omitKey(sessionSaveErrors.value, id)
      if (activeId.value === id) {
        activeId.value = null
      }
      return true
    } catch (error) {
      reportStorageError('delete session')(error)
      return false
    } finally {
      runtime.deletingSessions.delete(id)
      // 删除失败时保留缓存里的会话，并把停止生成后的最新状态保存回去。
      if (sessionCache.value[id] !== undefined) {
        persist(id)
      }
    }
  }

  /**
   * 删除全部会话：先中止所有生成与自动标题请求并等流收尾（含落盘），
   * 再清空本地三张表与运行态，最后重置列表、草稿与搜索面板。
   */
  const deleteAll = async (): Promise<boolean> => {
    if (deletingAll) {
      return false
    }
    deletingAll = true
    try {
      const handles = [...runtime.streaming.values()]
      for (const handle of handles) {
        handle.controller.abort()
      }
      for (const controller of runtime.titleRequests) {
        controller.abort()
      }
      await Promise.all(handles.map((handle) => handle.done))
      await db.clearAllSessions()
      resetChatRuntime(runtime)
      sessions.value = []
      sessionCache.value = {}
      sessionLoadErrors.value = {}
      sessionSaveErrors.value = {}
      activeId.value = null
      useDraftsStore().clearAll()
      useUiStore().closeSearchPanel()
      return true
    } catch (error) {
      reportStorageError('delete all sessions')(error)
      return false
    } finally {
      deletingAll = false
    }
  }

  return {
    ready,
    initError,
    sessions,
    sessionCache,
    sessionLoadErrors,
    sessionSaveErrors,
    activeId,
    init,
    select,
    newChat,
    rename,
    remove,
    deleteAll,
    ensureLoaded,
    persist,
    retrySave,
  }
})
