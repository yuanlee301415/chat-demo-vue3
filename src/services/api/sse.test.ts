import { describe, expect, it } from 'vitest'

import { readServerSentEvents, ServerSentEventDecoder, type ServerSentEvent } from './sse'

/** 把若干文本分片包成一个只读字节流，模拟网络分片到达。 */
const streamOf = (chunks: string[]): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })

const collect = async (chunks: string[]) => {
  const events = []
  for await (const event of readServerSentEvents(streamOf(chunks))) events.push(event)
  return events
}

describe('ServerSentEventDecoder', () => {
  it('跨分片的 data 会拼成同一个事件', () => {
    const decoder = new ServerSentEventDecoder()

    expect(decoder.push('data: he')).toEqual([])
    expect(decoder.push('llo\r\n\r\n')).toEqual([{ event: 'message', data: 'hello', lastEventId: '' }])
  })

  it('支持多行 data、event 与 id', () => {
    const decoder = new ServerSentEventDecoder()
    const events = decoder.push('event: delta\nid: 7\ndata: a\ndata: b\n\n')

    expect(events).toEqual([{ event: 'delta', data: 'a\nb', lastEventId: '7' }])
  })

  it('忽略注释行', () => {
    const decoder = new ServerSentEventDecoder()

    expect(decoder.push(': keep-alive\n\ndata: x\n\n')).toEqual([{ event: 'message', data: 'x', lastEventId: '' }])
  })

  it('含 NUL 的 id 不更新', () => {
    const decoder = new ServerSentEventDecoder()

    expect(decoder.push('id: keep\ndata: a\n\n')).toEqual([{ event: 'message', data: 'a', lastEventId: 'keep' }])
    expect(decoder.push('id: bad\u0000id\ndata: b\n\n')).toEqual([{ event: 'message', data: 'b', lastEventId: 'keep' }])
  })

  it('end 把结尾的 CR 当作换行派发，未结束的事件丢弃', () => {
    const decoder = new ServerSentEventDecoder()
    decoder.push('data: done\n\r')

    expect(decoder.end()).toEqual([{ event: 'message', data: 'done', lastEventId: '' }])

    const partial = new ServerSentEventDecoder()
    partial.push('data: pending')
    expect(partial.end()).toEqual([])
  })
})

describe('readServerSentEvents', () => {
  it('逐段解析到结束', async () => {
    const events = await collect(['data: one\n', '\ndata: two\n\n'])

    expect(events.map((event) => event.data)).toEqual(['one', 'two'])
  })

  it('中止时结束读取', async () => {
    const controller = new AbortController()
    // 永不结束的流：没有中止信号时 read() 会一直挂起。
    const stream = new ReadableStream<Uint8Array>({ start() {} })
    const events: ServerSentEvent[] = []
    const task = (async () => {
      for await (const event of readServerSentEvents(stream, controller.signal)) {
        events.push(event)
      }
    })()

    controller.abort()
    await expect(task).resolves.toBeUndefined()
    expect(events).toEqual([])
  })
})
