import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from './ApiError'
import { request, streamMessage } from './client'
import type { CreateMessageRequest } from './types'

const body: CreateMessageRequest = {
  model: 'deepseek-flash',
  system: '',
  messages: [{ role: 'user', content: 'hi' }],
  thinking: { type: 'disabled' },
  tools: [],
  safety_check: { level: 'high' },
}

/** 把若干文本分片包成只读字节流。 */
const streamOf = (chunks: string[]): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })

const sseResponse = (chunks: string[]): Response => new Response(streamOf(chunks), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })

const consume = async (signal: AbortSignal) => {
  const events = []
  for await (const event of streamMessage('sk-test', body, signal)) events.push(event)
  return events
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('网络异常归一为 network', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    await expect(request('https://example.com', {})).rejects.toMatchObject({ name: 'ApiError', kind: 'network' })
  })

  it('非 2xx 读出服务端文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":{"message":"bad key"}}', { status: 401 })))

    await expect(request('https://example.com', {})).rejects.toMatchObject({ kind: 'http', status: 401, message: 'bad key' })
  })

  it('主动中止时不包装成网络错误', async () => {
    const controller = new AbortController()
    controller.abort()
    const abortError = new DOMException('aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    await expect(request('https://example.com', { signal: controller.signal })).rejects.toBe(abortError)
  })
})

describe('streamMessage', () => {
  it('逐个产出事件并在 message_stop 结束', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(sseResponse(['event: message_start\ndata: {"type":"message_start","message":{"id":"m"}}\n\n', 'event: message_stop\ndata: {"type":"message_stop"}\n\n', 'event: message_stop\ndata: {"type":"message_stop"}\n\n'])),
    )

    const events = await consume(new AbortController().signal)

    expect(events.map((event) => event.type)).toEqual(['message_start', 'message_stop'])
  })

  it('响应不是 SSE 时报 protocol', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })))

    await expect(consume(new AbortController().signal)).rejects.toMatchObject({ kind: 'protocol' })
  })

  it('错误帧转成 stream 错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(['event: error\ndata: {"error":{"message":"busy"}}\n\n'])))

    await expect(consume(new AbortController().signal)).rejects.toMatchObject({ kind: 'stream', message: 'busy' })
  })

  it('没有 message_stop 就结束时抛 interrupted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(['event: message_start\ndata: {"type":"message_start","message":{"id":"m"}}\n\n'])))

    await expect(consume(new AbortController().signal)).rejects.toMatchObject({ kind: 'interrupted' })
  })
})

describe('ApiError', () => {
  it('TranslationMessage 会按中文文案渲染', () => {
    const error = new ApiError('http', { key: 'replyRateLimited' }, 429)

    expect(error.message).toBe('请求过于频繁，请稍后再试')
    expect(error.localMessage).toEqual({ key: 'replyRateLimited' })
  })
})
