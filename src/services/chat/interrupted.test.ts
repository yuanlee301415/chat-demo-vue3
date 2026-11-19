import { describe, expect, it } from 'vitest'

import { settleInterrupted } from './interrupted'
import type { Session } from './types'

const session = (messages: Session['messages']): Session => ({
  id: 's',
  title: '',
  createdAt: 1,
  updatedAt: 500,
  messages,
  rootMessageId: null,
})

describe('settleInterrupted', () => {
  it('把 pending / streaming 的回复收尾为 stopped', () => {
    const settled = settleInterrupted(
      session([
        { id: 'u', role: 'user', content: 'hi', files: [], createdAt: 1 },
        { id: 'r', role: 'assistant', createdAt: 2, model: null, prefix: true, status: 'streaming', blocks: [{ type: 'thinking', thinking: 'a', signature: '', startedAt: 100 }] },
      ]),
    )

    expect(settled.messages[1]).toMatchObject({ status: 'stopped', blocks: [{ endedAt: 500 }] })
  })

  it('没有未完成回复时原样返回', () => {
    const original = session([{ id: 'u', role: 'user', content: 'hi', files: [], createdAt: 1 }])

    expect(settleInterrupted(original)).toBe(original)
  })
})
