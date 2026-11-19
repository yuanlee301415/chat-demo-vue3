import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import type { StoredFile } from '../services/chat/db'

/**
 * 非响应式的运行态：Map/Set/AbortController 这类对象不该进 Pinia 的响应式系统，
 * 也不该做成模块级全局（否则测试之间会串状态）。每个 Pinia 实例创建一份，由 session/stream store 共享。
 */
export interface ChatRuntime {
  /** 会话最近访问时间（毫秒），用于缓存淘汰 */
  sessionAccess: Map<string, number>
  /** 访问序号，越大越新；与 sessionAccess 一起实现 LRU */
  accessSequence: number
  /** 有未落盘改动的会话 id */
  unsavedSessions: Set<string>
  /** 尚未写入 DB 的附件原件 */
  pendingFiles: Map<string, StoredFile[]>
  /** 正在删除的会话，避免并发操作 */
  deletingSessions: Set<string>
  /** 每个会话的流控制器；AbortController 不能放进响应式状态 */
  streaming: Map<string, AbortController>
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
  accessSequence: 0,
  unsavedSessions: new Set(),
  pendingFiles: new Map(),
  deletingSessions: new Set(),
  streaming: new Map(),
  streamFlushes: new Map(),
  titleRequests: new Set(),
  sessionLoads: new Map(),
  initTask: undefined,
})

/** 清空运行态；「删除全部会话」与测试重置用。在途请求由调用方负责中止。 */
export const resetChatRuntime = (runtime: ChatRuntime): void => {
  runtime.sessionAccess.clear()
  runtime.accessSequence = 0
  runtime.unsavedSessions.clear()
  runtime.pendingFiles.clear()
  runtime.deletingSessions.clear()
  runtime.streaming.clear()
  runtime.streamFlushes.clear()
  runtime.titleRequests.clear()
  runtime.sessionLoads.clear()
  runtime.initTask = undefined
}

/**
 * 用 Pinia 承载运行态单例：`markRaw` 保证对象不被代理，每个 Pinia 实例各有一份，
 * 测试里 `setActivePinia(createPinia())` 即可拿到干净的运行态。
 */
export const useRuntimeStore = defineStore('chatRuntime', () => {
  const runtime = markRaw(createChatRuntime())
  return { runtime }
})
