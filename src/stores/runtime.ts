import type { StoredFile } from '../services/chat/db'

/**
 * 非响应式的运行态：Map/Set/AbortController 这类对象不该进 Pinia 的响应式系统，
 * 也不该做成模块级全局（否则测试之间会串状态）。由 `createChatRuntime()` 每个应用实例创建一份。
 */
export interface ChatRuntime {
  /** 会话最近访问时间（毫秒），用于缓存淘汰 */
  sessionAccess: Map<string, number>
  /** 有未落盘改动的会话 id */
  unsavedSessions: Set<string>
  /** 尚未写入 DB 的附件原件 */
  pendingFiles: Map<string, StoredFile[]>
  /** 正在删除的会话，避免并发操作 */
  deletingSessions: Set<string>
  /** 每个会话注册的流式 flush 回调 */
  streamFlushes: Map<string, () => void>
  /** 进行中的自动标题请求，切换/删除会话时中止 */
  titleRequests: Set<AbortController>
  /** 会话详情的并发加载去重 */
  sessionLoads: Map<string, { promise: Promise<void> }>
  /** 初始化任务，只跑一次 */
  initTask?: Promise<void>
}

export const createChatRuntime = (): ChatRuntime => ({
  sessionAccess: new Map(),
  unsavedSessions: new Set(),
  pendingFiles: new Map(),
  deletingSessions: new Set(),
  streamFlushes: new Map(),
  titleRequests: new Set(),
  sessionLoads: new Map(),
  initTask: undefined,
})

/** 清空运行态；「删除全部会话」与测试重置用。在途请求由调用方负责中止。 */
export const resetChatRuntime = (runtime: ChatRuntime): void => {
  runtime.sessionAccess.clear()
  runtime.unsavedSessions.clear()
  runtime.pendingFiles.clear()
  runtime.deletingSessions.clear()
  runtime.streamFlushes.clear()
  runtime.titleRequests.clear()
  runtime.sessionLoads.clear()
  runtime.initTask = undefined
}
