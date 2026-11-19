import { describe, expect, it } from 'vitest'

import { readMessageEvent } from './parseEvent'
import type { MessageStreamEvent } from './types'

const usage = { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 }

/** 断言事件是指定类型，便于测试里直接访问字段。 */
const expectEvent = <T extends MessageStreamEvent['type']>(value: unknown, type: T): Extract<MessageStreamEvent, { type: T }> => {
  const event = readMessageEvent(value)
  expect(event?.type).toBe(type)
  return event as Extract<MessageStreamEvent, { type: T }>
}

describe('readMessageEvent', () => {
  it('message_start 保留合法 usage，非法则置空', () => {
    expect(expectEvent({ type: 'message_start', message: { id: 'm', usage } }, 'message_start').message.usage).toEqual(usage)

    expect(expectEvent({ type: 'message_start', message: { id: 'm', usage: { input_tokens: 'x' } } }, 'message_start').message.usage).toBeUndefined()
  })

  it('content_block_start 过滤非法引用', () => {
    const event = expectEvent(
      {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'text',
          text: 'hi',
          citations: [
            { type: 'web_search_result_location', url: 'https://a.com', title: null },
            { type: 'web_search_result_location', url: 1, title: null },
          ],
        },
      },
      'content_block_start',
    )

    expect(event.content_block.type).toBe('text')
    expect((event.content_block as { citations: unknown[] }).citations).toHaveLength(1)
  })

  it('content_block_start 接受服务端工具调用，拒绝未知 kind', () => {
    expect(
      expectEvent(
        {
          type: 'content_block_start',
          index: 0,
          content_block: { type: 'server_tool_use', id: 't1', name: 'deepseek_web_search', kind: 'search', input: { action: 'search', queries: ['q'] } },
        },
        'content_block_start',
      ).content_block.type,
    ).toBe('server_tool_use')

    expect(
      readMessageEvent({
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'server_tool_use', id: 't1', name: 'deepseek_web_search', kind: 'unknown', input: {} },
      }),
    ).toBeNull()
  })

  it('content_block_start 过滤搜索结果里的坏项', () => {
    const event = expectEvent(
      {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'web_search_tool_result',
          tool_use_id: 't1',
          kind: 'search',
          content: [
            { type: 'web_search_result', url: 'https://a.com', title: 'A', snippet: '', site_name: null, site_icon: null, page_age: null },
            { type: 'web_search_tool_result_error', error_code: 'unavailable' },
            { type: 'web_search_result', url: 2 },
          ],
        },
      },
      'content_block_start',
    )

    expect((event.content_block as { content: unknown[] }).content).toHaveLength(2)
  })

  it('content_block_delta 只接受已知 delta', () => {
    expect(expectEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'a' } }, 'content_block_delta').delta.type).toBe('text_delta')
    expect(readMessageEvent({ type: 'content_block_delta', index: 0, delta: { type: 'unknown_delta' } })).toBeNull()
  })

  it('message_delta 校验 stop_reason 并保留 title', () => {
    expect(expectEvent({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null, title: '标题' }, usage }, 'message_delta').delta).toMatchObject({
      stop_reason: 'end_turn',
      title: '标题',
    })

    expect(readMessageEvent({ type: 'message_delta', delta: { stop_reason: 'unknown' } })).toBeNull()
  })

  it('未知类型与非对象返回 null', () => {
    expect(readMessageEvent({ type: 'ping' })).toBeNull()
    expect(readMessageEvent(null)).toBeNull()
    expect(readMessageEvent('x')).toBeNull()
  })
})
