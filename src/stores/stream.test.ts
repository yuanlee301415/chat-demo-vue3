import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import 'fake-indexeddb/auto'

import { ApiError } from '../services/api/ApiError'
import type { MessageStreamEvent } from '../services/api/types'
import type { AssistantMessage, UserMessage } from '../services/chat/types'
import { useDraftsStore } from './drafts'
import { useSessionStore } from './session'
import { useSettingsStore } from './settings'
import { useStreamStore } from './stream'
import { useUploadsStore } from './uploads'

const streamMessage = vi.fn()
const uploadFile = vi.fn()

vi.mock('../services/api/client', () => ({
  streamMessage: (...args: unknown[]) => streamMessage(...args),
  uploadFile: (...args: unknown[]) => uploadFile(...args),
}))

/** 把事件列表包成异步生成器，模拟 SSE 逐个到达。 */
const events = (list: MessageStreamEvent[]): AsyncGenerator<MessageStreamEvent> =>
  (async function* () {
    for (const event of list) yield event
  })()

/** 一轮「文本 + 结束原因 + 标题」的事件序列。 */
const textEvents = (value: string, stopReason: 'end_turn' | 'max_tokens' = 'end_turn'): MessageStreamEvent[] => [
  { type: 'message_start', message: { id: 'm', model: 'deepseek-flash' } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: value } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: stopReason, stop_sequence: null, title: '新标题' } },
  { type: 'message_stop' },
]

/** 发一条提问并等流收尾，返回会话 id。 */
const sendAndWait = async (text: string, list: MessageStreamEvent[]) => {
  const session = useSessionStore()
  const stream = useStreamStore()
  streamMessage.mockReturnValueOnce(events(list))
  expect(stream.send(null, { text, files: [] })).toBe(true)
  const id = session.activeId
  expect(id).not.toBeNull()
  await stream.waitForIdle(id as string)
  return id as string
}

beforeEach(async () => {
  setActivePinia(createPinia())
  streamMessage.mockReset()
  uploadFile.mockReset()
  useSettingsStore().setApiKey('sk-test')
  await useSessionStore().init()
})

describe('send', () => {
  it('新建会话、追加提问与回答，并写入标题', async () => {
    const id = await sendAndWait('你好', textEvents('你好呀'))

    const session = useSessionStore().sessionCache[id]
    expect(session.messages).toHaveLength(2)
    expect(session.messages[0]).toMatchObject({ role: 'user', content: '你好' })
    expect(session.messages[1]).toMatchObject({ role: 'assistant', status: 'done' })
    expect(session.title).toBe('新标题')
    expect(session.messages[1]).toMatchObject({ blocks: [{ type: 'text', text: '你好呀' }] })
  })

  it('请求失败时记为 error 并保留错误分类', async () => {
    const stream = useStreamStore()
    const session = useSessionStore()
    streamMessage.mockImplementationOnce(() => {
      throw new ApiError('http', 'boom', 500)
    })

    expect(stream.send(null, { text: 'hi', files: [] })).toBe(true)
    const id = session.activeId as string
    await stream.waitForIdle(id)

    expect(session.sessionCache[id].messages[1]).toMatchObject({ status: 'error', error: { kind: 'http', message: 'boom', status: 500 } })
  })

  it('经草稿发送：附件带上 serverId，成功后清空草稿', async () => {
    const drafts = useDraftsStore()
    const uploads = useUploadsStore()
    const session = useSessionStore()
    const stream = useStreamStore()
    uploadFile.mockResolvedValueOnce({ id: 'file-1' })

    drafts.setText(null, '看图')
    expect(drafts.addFiles(null, [new File(['x'], 'a.png', { type: 'image/png' })], 'sk-test')).toBeNull()
    await uploads.waitFor(drafts.getDraft(null).attachments[0].id)

    streamMessage.mockReturnValueOnce(events(textEvents('收到')))
    expect(stream.sendDraft(null)).toBe(true)
    const id = session.activeId as string
    await stream.waitForIdle(id)

    expect((session.sessionCache[id].messages[0] as UserMessage).files[0]).toMatchObject({ serverId: 'file-1', name: 'a.png', isImage: true })
    expect(drafts.getDraft(null)).toEqual({ text: '', attachments: [] })
  })

  it('停止生成后按 stopped 收尾', async () => {
    const stream = useStreamStore()
    const session = useSessionStore()
    streamMessage.mockImplementationOnce((_key: string, _body: unknown, signal: AbortSignal) =>
      (async function* () {
        yield { type: 'message_start', message: { id: 'm', model: 'deepseek-flash' } } satisfies MessageStreamEvent
        await new Promise<void>((resolve) => {
          if (signal.aborted) resolve()
          else signal.addEventListener('abort', () => resolve(), { once: true })
        })
        throw new Error('aborted')
      })(),
    )

    stream.send(null, { text: 'hi', files: [] })
    const id = session.activeId as string
    stream.stop(id)
    await stream.waitForIdle(id)

    expect((session.sessionCache[id].messages[1] as AssistantMessage).status).toBe('stopped')
  })
})

describe('版本与续写', () => {
  it('重新生成在原问题下新增回答版本', async () => {
    const id = await sendAndWait('问', textEvents('一'))
    const session = useSessionStore()
    const stream = useStreamStore()
    const userMessage = session.sessionCache[id].messages[0]

    streamMessage.mockReturnValueOnce(events(textEvents('二')))
    stream.regenerate(id)
    await stream.waitForIdle(id)

    const assistants = session.sessionCache[id].messages.filter((message) => message.role === 'assistant')
    expect(assistants.map((message) => message.parentId)).toEqual([userMessage.id, userMessage.id])
  })

  it('编辑提问新增同父版本', async () => {
    const id = await sendAndWait('旧问', textEvents('答'))
    const session = useSessionStore()
    const stream = useStreamStore()
    const oldQuestion = session.sessionCache[id].messages[0]

    streamMessage.mockReturnValueOnce(events(textEvents('新答')))
    expect(stream.edit(id, oldQuestion.id, '新问')).toBe(true)
    await stream.waitForIdle(id)

    const users = session.sessionCache[id].messages.filter((message) => message.role === 'user')
    expect(users).toHaveLength(2)
    expect(users[1]).toMatchObject({ content: '新问', parentId: null })
  })

  it('续写把新内容追加到原回答', async () => {
    const id = await sendAndWait('问', textEvents('半', 'max_tokens'))
    const session = useSessionStore()
    const stream = useStreamStore()
    const reply = session.sessionCache[id].messages[1]

    streamMessage.mockReturnValueOnce(events(textEvents('续', 'end_turn')))
    stream.continueReply(id, reply.id)
    await stream.waitForIdle(id)

    const after = session.sessionCache[id].messages[1] as AssistantMessage
    expect(after.id).toBe(reply.id)
    expect((after.blocks[1] as { text: string }).text).toBe('续')
  })
})
