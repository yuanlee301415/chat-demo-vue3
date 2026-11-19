import { describe, expect, it } from 'vitest'

import type { MessageStreamEvent } from '../api/types'
import { applyEvent, canContinueReply, getContextRounds, getReplyText, getThinkingSeconds, settleReply, toRequestMessages } from './reply'
import type { AssistantMessage, FileAttachment, ReplyBlock, TextPart, UserMessage } from './types'

const reply = (patch: Partial<AssistantMessage> = {}): AssistantMessage => ({
  id: 'r',
  role: 'assistant',
  createdAt: 1,
  model: null,
  prefix: true,
  status: 'done',
  blocks: [],
  ...patch,
})

const user = (patch: Partial<UserMessage> = {}): UserMessage => ({
  id: 'u',
  role: 'user',
  content: 'hi',
  files: [],
  createdAt: 1,
  ...patch,
})

const attachment = (serverId: string | null, isImage = false): FileAttachment => ({
  id: 'f',
  serverId,
  name: 'f.png',
  size: 1,
  isImage,
  mimeType: 'image/png',
})

const apply = (target: AssistantMessage, event: MessageStreamEvent, map: Map<number, number> = new Map()) => applyEvent(target, event, 1000, map)

const textBlock = (text: string): ReplyBlock => ({ type: 'text', text })

describe('applyEvent', () => {
  it('追加文本块并按临时索引合并增量', () => {
    const map = new Map<number, number>()
    let current = apply(reply({ status: 'streaming' }), { type: 'content_block_start', index: 0, content_block: { type: 'text', text: 'he' } }, map)

    expect(map.get(0)).toBe(0)
    expect(current.status).toBe('streaming')

    current = apply(current, { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'llo' } }, map)

    expect((current.blocks[0] as TextPart).text).toBe('hello')
  })

  it('思考块累积正文、签名与结束时间', () => {
    const map = new Map<number, number>()
    let current = apply(reply({ status: 'streaming' }), { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: 'a', signature: '' } }, map)
    current = apply(current, { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'b' } }, map)
    current = apply(current, { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: 'sig' } }, map)
    current = apply(current, { type: 'content_block_stop', index: 0 }, map)

    expect(current.blocks[0]).toMatchObject({ type: 'thinking', thinking: 'ab', signature: 'sig', startedAt: 1000, endedAt: 1000 })
  })

  it('引用增量追加到文本块', () => {
    const map = new Map<number, number>()
    let current = apply(reply({ status: 'streaming' }), { type: 'content_block_start', index: 0, content_block: { type: 'text', text: 'a' } }, map)
    current = apply(
      current,
      {
        type: 'content_block_delta',
        index: 0,
        delta: {
          type: 'citations_delta',
          citation: { type: 'web_search_result_location', url: 'https://a.com', title: null, cited_text: '', encrypted_index: '' },
        },
      },
      map,
    )

    expect((current.blocks[0] as TextPart).citations).toHaveLength(1)
  })

  it('客户端工具调用不保存，并关闭续写', () => {
    const current = apply(reply({ status: 'streaming' }), {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'tool_use', id: 'x', name: 'tool', input: {} },
    })

    expect(current.blocks).toHaveLength(0)
    expect(current.prefix).toBe(false)
  })

  it('message_start 与 message_delta 更新用量与结束原因', () => {
    const usage = { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 2 }
    let current = apply(reply({ status: 'streaming' }), { type: 'message_start', message: { id: 'm', model: 'deepseek-flash', usage } })
    current = apply(current, { type: 'message_delta', delta: { stop_reason: 'max_tokens', stop_sequence: null } })

    expect(current.usage).toEqual(usage)
    expect(current.stopReason).toBe('max_tokens')
  })
})

describe('settleReply', () => {
  it('给未结束的思考块补结束时间', () => {
    const settled = settleReply(reply({ status: 'streaming', blocks: [{ type: 'thinking', thinking: 'a', startedAt: 1000 }] }), 'done', 3000)

    expect(settled.status).toBe('done')
    expect(settled.blocks[0]).toMatchObject({ endedAt: 3000 })
  })

  it('安全拒绝时丢弃思考与正文，只保留工具块', () => {
    const settled = settleReply(
      reply({
        status: 'streaming',
        stopReason: 'refusal',
        blocks: [
          { type: 'thinking', thinking: 'a', startedAt: 1000 },
          { type: 'text', text: 'b' },
          { type: 'server_tool_use', id: 't1', name: 'deepseek_read_url', input: { action: 'read_link', url: 'https://a.com' }, caller: { type: 'direct' }, kind: 'read_link' },
        ],
      }),
      'done',
      3000,
    )

    expect(settled.blocks.map((block) => block.type)).toEqual(['server_tool_use'])
  })
})

describe('canContinueReply', () => {
  it('只有停止或截断且有前缀的回复可续写', () => {
    expect(canContinueReply(reply({ status: 'stopped' }))).toBe(true)
    expect(canContinueReply(reply({ status: 'done', stopReason: 'max_tokens' }))).toBe(true)
    expect(canContinueReply(reply({ status: 'done', stopReason: 'end_turn' }))).toBe(false)
    expect(canContinueReply(reply({ status: 'stopped', prefix: false }))).toBe(false)
    expect(canContinueReply(reply({ status: 'stopped', stopReason: 'refusal' }))).toBe(false)
    expect(canContinueReply(reply({ status: 'stopped', blocks: [{ type: 'text', text: 'x', isTemplate: true }] }))).toBe(false)
  })
})

describe('getReplyText / getThinkingSeconds', () => {
  it('只拼接文本块', () => {
    expect(getReplyText(reply({ blocks: [textBlock('a'), { type: 'thinking', thinking: 'b' }, textBlock('c')] }))).toBe('ac')
  })

  it('思考用时至少 1 秒', () => {
    expect(getThinkingSeconds(0, 400)).toBe(1)
    expect(getThinkingSeconds(0, 2200)).toBe(2)
  })
})

describe('getContextRounds', () => {
  it('只保留提问 + 可用回答的成对轮次', () => {
    const history = [
      user({ id: 'u1' }),
      reply({ status: 'error' }),
      user({ id: 'u2' }),
      reply({ status: 'done', blocks: [textBlock('ok')] }),
      user({ id: 'u3' }),
      reply({ status: 'done', blocks: [{ type: 'text', text: '模板', isTemplate: true }] }),
      user({ id: 'u4' }),
      reply({ status: 'done', blocks: [] }),
    ]

    expect(getContextRounds(history).map(([question]) => question.id)).toEqual(['u2'])
  })
})

describe('toRequestMessages', () => {
  it('历史轮次 + 本轮提问，思考不进上下文', () => {
    const history = [user({ id: 'u1', content: '问一' }), reply({ status: 'done', blocks: [{ type: 'thinking', thinking: '想' }, textBlock('答一')] })]

    const messages = toRequestMessages(history, user({ id: 'u2', content: '问二' }))

    expect(messages).toHaveLength(3)
    expect(messages[1]).toEqual({ role: 'assistant', content: [{ type: 'text', text: '答一' }] })
  })

  it('按轮次插入 latest_reminder，内容相同不重复', () => {
    const history = [user({ id: 'u1' }), reply({ status: 'done', blocks: [textBlock('a')], latestReminder: 'r1' })]

    const messages = toRequestMessages(history, user({ id: 'u2' }), undefined, false, 'r1')

    expect(messages.filter((message) => message.role === 'latest_reminder')).toHaveLength(1)
  })

  it('有 serverId 的附件转成文件块并排在正文前', () => {
    const messages = toRequestMessages([], user({ content: '看图', files: [attachment('file-1', true)] }))

    expect(messages[0]).toEqual({
      role: 'user',
      content: [
        { type: 'image', source: { type: 'file', file_id: 'file-1' } },
        { type: 'text', text: '看图' },
      ],
    })
  })

  it('缺少签名的 read_link 调用与结果都不回传', () => {
    const readCall = {
      type: 'server_tool_use' as const,
      id: 't1',
      name: 'deepseek_read_url' as const,
      input: { action: 'read_link' as const, url: 'https://a.com' },
      caller: { type: 'direct' as const },
      kind: 'read_link' as const,
    }
    const result = {
      type: 'web_fetch_tool_result' as const,
      tool_use_id: 't1',
      kind: 'read_link' as const,
      content: { type: 'web_fetch_result' as const, url: 'https://a.com', content: { type: 'document' as const, source: { type: 'text' as const, media_type: 'text/plain' as const, data: '' }, title: null }, published_at: null },
    }

    const unsigned = toRequestMessages([user(), reply({ status: 'done', blocks: [textBlock('a'), readCall, result] })], user({ id: 'u2' }))
    expect(unsigned[1]).toEqual({ role: 'assistant', content: [{ type: 'text', text: 'a' }] })

    const signed = toRequestMessages([user(), reply({ status: 'done', blocks: [textBlock('a'), readCall, { ...result, signature: 'sig' }] })], user({ id: 'u2' }))
    expect((signed[1]?.content as unknown[]).length).toBe(3)
  })

  it('续写把末尾 assistant 作为 prefill，空白 prefill 不发送', () => {
    const prefix = reply({ status: 'stopped', blocks: [textBlock('半句')] })
    const withPrefix = toRequestMessages([], user({ id: 'u2' }), prefix)
    expect(withPrefix.at(-1)).toMatchObject({ role: 'assistant', content: [{ type: 'text', text: '半句' }] })

    const empty = toRequestMessages([], user({ id: 'u3' }), reply({ status: 'stopped', blocks: [textBlock('   ')] }))
    expect(empty.at(-1)).toMatchObject({ role: 'user' })
  })
})
