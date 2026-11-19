import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import { ApiError } from '../services/api/ApiError'
import { streamMessage } from '../services/api/client'
import type { ChatModel, CreateMessageRequest } from '../services/api/types'
import { appendBranch, getVisibleMessages, selectVersion as selectBranchVersion } from '../services/chat/branches'
import { applyEvent, canContinueReply, settleReply, toRequestMessages } from '../services/chat/reply'
import { createLatestReminder } from '../services/chat/latestReminder'
import type { AssistantMessage, FileAttachment, Message, Session, UserMessage } from '../services/chat/types'
import { toSessionSummary } from '../services/chat/types'
import { createId } from '../utils/id'
import { useRuntimeStore } from './runtime'
import { useSessionStore } from './session'
import { useSettingsStore } from './settings'
import { prepareDraftMessage, useDraftsStore } from './drafts'
import { useUploadsStore } from './uploads'

/** deepseek-flash 同时支持深度思考与图片输入。 */
const MODEL: ChatModel = 'deepseek-flash'
/** 所有生成请求统一携带的助手身份说明。 */
const SYSTEM_PROMPT = '该助手为DeepSeek，由深度求索公司创造。'
/** 安全审核固定开启。 */
const SAFETY_CHECK = { level: 'high' } as const

/** 阅读链接始终开启；智能搜索开关再追加搜索工具（含边想边搜）。 */
const serverTools = (search: boolean): CreateMessageRequest['tools'] => {
  const tools: CreateMessageRequest['tools'] = [{ type: 'deepseek_read_url', name: 'deepseek_read_url' }]
  if (search) {
    tools.push({ type: 'deepseek_web_search', name: 'deepseek_web_search' })
  }
  return tools
}

/** 一次生成请求的输入快照。 */
type Request = {
  /** 进入上下文的可见历史（不含本轮提问） */
  history: Message[]
  /** 本轮提问 */
  question: UserMessage
  /** 续写时要回传的末尾回答 */
  prefix?: AssistantMessage
}

/** 按 `updatedAt` 降序排列摘要。 */
const sortSummaries = (sessions: ReturnType<typeof toSessionSummary>[]) => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)

/**
 * 流式生成：发送、停止、重新生成、编辑、续写与版本切换。
 * 会话数据仍归 session store；这里只负责发起请求、合并事件与收尾落盘。
 */
export const useStreamStore = defineStore('stream', () => {
  const runtime = useRuntimeStore().runtime
  const sessionStore = useSessionStore()
  const settings = useSettingsStore()
  const drafts = useDraftsStore()
  const uploads = useUploadsStore()
  /** 正在生成的会话 id，供界面显示停止按钮 */
  const streamingIds = shallowRef<Record<string, true>>({})

  /** 取已加载的会话详情；未加载返回 undefined。 */
  const getSession = (id: string): Session | undefined => sessionStore.sessionCache[id]

  /** 写回会话详情并同步摘要（标题/更新时间变化都要反映到列表）。 */
  const setSession = (id: string, next: Session) => {
    sessionStore.sessionCache = { ...sessionStore.sessionCache, [id]: next }
    const summary = toSessionSummary(next)
    sessionStore.sessions = sortSummaries(sessionStore.sessions.map((item) => (item.id === id ? summary : item)))
  }

  /** 用更新函数替换会话；会话不存在时忽略。 */
  const updateSession = (id: string, update: (session: Session) => Session) => {
    const session = getSession(id)
    if (session !== undefined) {
      setSession(id, update(session))
    }
  }

  /** 用新版本替换单条消息，保留分支指针（parentId / selectedChildId）。 */
  const updateReply = (id: string, reply: AssistantMessage) => {
    updateSession(id, (session) => ({
      ...session,
      messages: session.messages.map((message) => (message.id === reply.id ? { ...reply, parentId: message.parentId, selectedChildId: message.selectedChildId } : message)),
    }))
  }

  /** 按当前开关创建回复：深度思考对应 thinking，智能搜索控制是否声明搜索工具。 */
  const createReply = (): AssistantMessage => ({
    id: createId(),
    role: 'assistant',
    createdAt: Date.now(),
    model: MODEL,
    thinking: settings.thinking,
    search: settings.search,
    prefix: true,
    status: 'pending',
    blocks: [],
  })

  /**
   * 请求并消费一条流：增量按动画帧刷新内存，结束/失败/停止后统一收尾并落盘。
   * 流句柄放进 runtime，`waitForIdle` 与删除会话都靠它等待收尾。
   */
  const streamReply = (sessionId: string, initial: AssistantMessage, request: Request) => {
    const controller = new AbortController()
    let resolveDone: () => void = () => {}
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve
    })
    runtime.streaming.set(sessionId, { controller, done })
    streamingIds.value = { ...streamingIds.value, [sessionId]: true }

    const titleRequested = !getSession(sessionId)?.title
    if (titleRequested) {
      runtime.titleRequests.add(controller)
    }

    void (async () => {
      let reply = initial
      let frame = 0
      /** 把内存里的最新回复同步到会话（合并同一帧内的多次增量）。 */
      const flush = () => {
        frame = 0
        updateReply(sessionId, reply)
      }
      const schedule = (callback: () => void): number => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : (setTimeout(callback, 16) as unknown as number))
      const cancel = (id: number) => {
        if (id === 0) {
          return
        }
        if (typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(id)
        } else {
          clearTimeout(id)
        }
      }
      runtime.streamFlushes.set(sessionId, flush)

      try {
        // 续写沿用原回答的系统信息快照；新回复按当前时间生成。
        const latestReminder = request.prefix?.latestReminder ?? createLatestReminder(settings.location)
        reply = { ...reply, latestReminder }
        updateReply(sessionId, reply)
        const events = streamMessage(
          settings.apiKey ?? '',
          {
            model: initial.model ?? MODEL,
            system: SYSTEM_PROMPT,
            messages: toRequestMessages(request.history, request.question, request.prefix, initial.thinking ?? false, latestReminder),
            thinking: { type: initial.thinking ? 'enabled' : 'disabled' },
            tools: serverTools(initial.search ?? false),
            safety_check: SAFETY_CHECK,
            ...(titleRequested ? { title: { enabled: true } } : {}),
          },
          controller.signal,
        )
        const blockIndexes = new Map<number, number>()
        for await (const event of events) {
          if (event.type === 'message_delta' && event.delta.title !== undefined && titleRequested && !controller.signal.aborted) {
            const title = event.delta.title.trim()
            if (title !== '') {
              updateSession(sessionId, (session) => (session.title === '' ? { ...session, title } : session))
              runtime.titleRequests.delete(controller)
            }
          }
          reply = applyEvent(reply, event, Date.now(), blockIndexes)
          if (frame === 0) {
            frame = schedule(flush)
          }
        }
        reply = settleReply(reply, 'done', Date.now())
      } catch (error) {
        if (controller.signal.aborted) {
          reply = settleReply(reply, 'stopped', Date.now())
        } else if (error instanceof ApiError && error.kind === 'interrupted' && reply.stopReason !== undefined) {
          // 已收到结束原因，只是缺了 message_stop，按正常完成收尾。
          reply = settleReply(reply, 'done', Date.now())
        } else if (error instanceof ApiError) {
          reply = settleReply(reply, 'error', Date.now(), {
            kind: error.kind,
            message: error.message,
            status: error.status,
            localMessage: error.localMessage,
          })
        } else {
          reply = settleReply(reply, 'error', Date.now(), {
            kind: 'protocol',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      } finally {
        cancel(frame)
        runtime.titleRequests.delete(controller)
        runtime.streamFlushes.delete(sessionId)
        runtime.streaming.delete(sessionId)
        if (getSession(sessionId) !== undefined) {
          updateReply(sessionId, reply)
          updateSession(sessionId, (session) => ({ ...session, updatedAt: Date.now() }))
          sessionStore.persist(sessionId)
        }
        const nextIds = { ...streamingIds.value }
        delete nextIds[sessionId]
        streamingIds.value = nextIds
        resolveDone()
      }
    })()
  }

  /** 发起一条流；调用方不等待，需要收尾时用 `waitForIdle`。 */
  const startStream = (sessionId: string, reply: AssistantMessage, request: Request) => {
    streamReply(sessionId, reply, request)
  }

  /** 当前会话是否正在生成。 */
  const isStreaming = (id: string): boolean => streamingIds.value[id] === true

  /** 等当前流完全收尾（含落盘）；没有流时立即返回。 */
  const waitForIdle = async (id: string): Promise<void> => {
    await runtime.streaming.get(id)?.done
  }

  /** 停止生成；收尾由流的 finally 完成。 */
  const stop = (id: string) => {
    runtime.streaming.get(id)?.controller.abort()
  }

  /** 提交一条提问；null 表示新建会话。`blobs` 是附件的原件，由调用方从草稿带上。 */
  const send = (targetSessionId: string | null, question: { text: string; files: FileAttachment[]; blobs?: { id: string; blob: Blob }[] }): boolean => {
    if (!sessionStore.ready) {
      return false
    }
    const text = question.text.trim()
    if (text === '' && question.files.length === 0) {
      return false
    }
    let sessionId = targetSessionId
    if (sessionId !== null && (runtime.deletingSessions.has(sessionId) || runtime.streaming.has(sessionId) || getSession(sessionId) === undefined)) {
      return false
    }
    const now = Date.now()
    if (sessionId === null) {
      const session: Session = { id: createId(), title: '', createdAt: now, updatedAt: now, messages: [], rootMessageId: null }
      sessionId = session.id
      runtime.sessionAccess.set(session.id, (runtime.accessSequence += 1))
      sessionStore.sessionCache = { ...sessionStore.sessionCache, [session.id]: session }
      sessionStore.sessions = sortSummaries([toSessionSummary(session), ...sessionStore.sessions])
      sessionStore.activeId = session.id
    }
    const current = getSession(sessionId)
    if (current === undefined) {
      return false
    }
    const history = getVisibleMessages(current)
    const userMessage: UserMessage = {
      id: createId(),
      role: 'user',
      content: text,
      files: question.files.map(({ id, serverId, name, size, isImage, mimeType }) => ({ id, serverId, name, size, isImage, mimeType })),
      createdAt: now,
    }
    const reply = createReply()
    setSession(sessionId, { ...appendBranch(current, history.at(-1)?.id ?? null, [userMessage, reply]), updatedAt: now })
    if (question.blobs !== undefined && question.blobs.length > 0) {
      runtime.pendingFiles.set(sessionId, question.blobs)
    }
    sessionStore.persist(sessionId)
    startStream(sessionId, reply, { history, question: userMessage })
    return true
  }

  /** 重新生成当前路径上的回答：在原问题下新增版本，不覆盖旧回答。 */
  const regenerate = (sessionId: string, messageId?: string) => {
    if (runtime.deletingSessions.has(sessionId) || runtime.streaming.has(sessionId)) {
      return
    }
    const session = getSession(sessionId)
    if (session === undefined) {
      return
    }
    const path = getVisibleMessages(session)
    const index = messageId === undefined ? path.length - 1 : path.findIndex((message) => message.id === messageId)
    const question = path[index - 1]
    if (question?.role !== 'user' || path[index]?.role !== 'assistant') {
      return
    }
    const reply = createReply()
    updateSession(sessionId, (current) => ({ ...appendBranch(current, question.id, [reply]), updatedAt: Date.now() }))
    sessionStore.persist(sessionId)
    startStream(sessionId, reply, { history: path.slice(0, index - 1), question })
  }

  /** 编辑提问：新增同父版本并保留原附件，旧回答仍可切回。 */
  const edit = (sessionId: string, messageId: string, content: string): boolean => {
    if (runtime.deletingSessions.has(sessionId) || runtime.streaming.has(sessionId)) {
      return false
    }
    const session = getSession(sessionId)
    if (session === undefined) {
      return false
    }
    const path = getVisibleMessages(session)
    const index = path.findIndex((message) => message.id === messageId)
    const previous = path[index]
    const text = content.trim()
    if (previous?.role !== 'user' || (text === '' && previous.files.length === 0)) {
      return false
    }
    const question: UserMessage = { id: createId(), role: 'user', content: text, files: previous.files, createdAt: Date.now() }
    const reply = createReply()
    updateSession(sessionId, (current) => ({ ...appendBranch(current, path[index - 1]?.id ?? null, [question, reply]), updatedAt: Date.now() }))
    sessionStore.persist(sessionId)
    startStream(sessionId, reply, { history: path.slice(0, index), question })
    return true
  }

  /** 切到同一父节点下的另一个版本。 */
  const selectVersion = (sessionId: string, messageId: string) => {
    if (runtime.deletingSessions.has(sessionId) || runtime.streaming.has(sessionId)) {
      return
    }
    updateSession(sessionId, (session) => selectBranchVersion(session, messageId))
    sessionStore.persist(sessionId)
  }

  /** 继续最后一条未完成的回答：保留原消息，新流追加到已有块之后。 */
  const continueReply = (sessionId: string, messageId: string) => {
    if (runtime.deletingSessions.has(sessionId) || runtime.streaming.has(sessionId)) {
      return
    }
    const session = getSession(sessionId)
    if (session === undefined) {
      return
    }
    const path = getVisibleMessages(session)
    const question = path.at(-2)
    const previous = path.at(-1)
    if (question?.role !== 'user' || previous?.role !== 'assistant' || previous.id !== messageId || !canContinueReply(previous)) {
      return
    }
    const reply: AssistantMessage = {
      ...previous,
      model: previous.model ?? MODEL,
      thinking: previous.thinking ?? settings.thinking,
      search: previous.search ?? settings.search,
      status: 'pending',
      stopReason: undefined,
      stopDetails: undefined,
      error: undefined,
    }
    updateReply(sessionId, reply)
    updateSession(sessionId, (current) => ({ ...current, updatedAt: Date.now() }))
    sessionStore.persist(sessionId)
    startStream(sessionId, reply, { history: path.slice(0, -2), question, prefix: previous })
  }

  /** 用当前草稿发送：附件必须全部上传成功，成功后清空草稿、原件交给会话。 */
  const sendDraft = (targetSessionId: string | null): boolean => {
    const prepared = prepareDraftMessage(drafts.getDraft(targetSessionId), uploads.tasks)
    if (prepared === null) {
      return false
    }
    const ok = send(targetSessionId, {
      text: prepared.text,
      files: prepared.files,
      blobs: prepared.files.map(({ id, blob }) => ({ id, blob })),
    })
    if (ok) {
      drafts.clearSentDraft(targetSessionId)
    }
    return ok
  }

  return { streamingIds, isStreaming, waitForIdle, send, sendDraft, stop, regenerate, edit, selectVersion, continueReply }
})
