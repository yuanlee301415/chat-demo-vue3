import { describe, expect, it } from 'vitest'

import { createChatRuntime, resetChatRuntime } from './runtime'

describe('createChatRuntime', () => {
  it('每次创建互不共享', () => {
    const first = createChatRuntime()
    const second = createChatRuntime()

    first.unsavedSessions.add('s1')

    expect(second.unsavedSessions.size).toBe(0)
    expect(first).not.toBe(second)
  })

  it('reset 清空所有容器与初始化任务', () => {
    const runtime = createChatRuntime()
    runtime.sessionAccess.set('s1', 1)
    runtime.accessSequence = 3
    runtime.unsavedSessions.add('s1')
    runtime.pendingFiles.set('s1', [])
    runtime.deletingSessions.add('s1')
    runtime.streaming.set('s1', new AbortController())
    runtime.streamFlushes.set('s1', () => {})
    runtime.titleRequests.add(new AbortController())
    runtime.sessionLoads.set('s1', { promise: Promise.resolve() })
    runtime.initTask = Promise.resolve()

    resetChatRuntime(runtime)

    expect(runtime.sessionAccess.size).toBe(0)
    expect(runtime.accessSequence).toBe(0)
    expect(runtime.unsavedSessions.size).toBe(0)
    expect(runtime.pendingFiles.size).toBe(0)
    expect(runtime.deletingSessions.size).toBe(0)
    expect(runtime.streaming.size).toBe(0)
    expect(runtime.streamFlushes.size).toBe(0)
    expect(runtime.titleRequests.size).toBe(0)
    expect(runtime.sessionLoads.size).toBe(0)
    expect(runtime.initTask).toBeUndefined()
  })
})
