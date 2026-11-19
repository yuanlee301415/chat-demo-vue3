import 'fake-indexeddb/auto'

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useRuntimeStore } from './runtime'
import type { Session } from '../services/chat/types'
import { useSessionStore } from './session'

/** 构造一个最小会话（指定更新时间用于排序）。 */
const session = (id: string, updatedAt: number): Session => ({
  id,
  title: `会话 ${id}`,
  createdAt: 1,
  updatedAt,
  messages: [],
})

beforeEach(async () => {
  setActivePinia(createPinia())
  await useRuntimeStore().runtime.db.clearAllSessions()
})

describe('session store', () => {
  it('init 按 updatedAt 降序加载列表', async () => {
    await useRuntimeStore().runtime.db.saveSession(session('a', 1))
    await useRuntimeStore().runtime.db.saveSession(session('b', 3))
    await useRuntimeStore().runtime.db.saveSession(session('c', 2))

    const store = useSessionStore()
    await store.init()

    expect(store.ready).toBe(true)
    expect(store.initError).toBe(false)
    expect(store.sessions.map((item) => item.id)).toEqual(['b', 'c', 'a'])
  })

  it('select 只接受列表里的 id，并加载详情', async () => {
    await useRuntimeStore().runtime.db.saveSession(session('a', 1))

    const store = useSessionStore()
    await store.init()

    store.select('missing')
    expect(store.activeId).toBeNull()

    store.select('a')
    await store.ensureLoaded('a')

    expect(store.activeId).toBe('a')
    expect(store.sessionCache.a?.title).toBe('会话 a')
  })

  it('重命名已加载的会话会同步更新列表并落盘', async () => {
    await useRuntimeStore().runtime.db.saveSession(session('a', 1))

    const store = useSessionStore()
    await store.init()
    store.select('a')
    await store.ensureLoaded('a')

    store.rename('a', '新标题')

    expect(store.sessions[0]?.title).toBe('新标题')
    expect(store.sessionCache.a?.title).toBe('新标题')
    await vi.waitFor(async () => {
      expect((await useRuntimeStore().runtime.db.loadSession('a'))?.title).toBe('新标题')
    })
  })

  it('重命名未加载的会话直接写库', async () => {
    await useRuntimeStore().runtime.db.saveSession(session('b', 1))

    const store = useSessionStore()
    await store.init()

    store.rename('b', '远程改名')

    expect(store.sessions[0]?.title).toBe('远程改名')
    expect(store.sessionCache.b).toBeUndefined()
    await vi.waitFor(async () => {
      expect((await useRuntimeStore().runtime.db.loadSession('b'))?.title).toBe('远程改名')
    })
  })

  it('remove 清空列表、缓存与 activeId，并删除库记录', async () => {
    await useRuntimeStore().runtime.db.saveSession(session('a', 1))

    const store = useSessionStore()
    await store.init()
    store.select('a')
    await store.ensureLoaded('a')

    const removed = await store.remove('a')

    expect(removed).toBe(true)
    expect(store.sessions).toEqual([])
    expect(store.sessionCache.a).toBeUndefined()
    expect(store.activeId).toBeNull()
    expect(await useRuntimeStore().runtime.db.loadSession('a')).toBeUndefined()
  })

  it('详情缓存超过上限时按最近访问淘汰', async () => {
    for (let index = 1; index <= 7; index += 1) {
      await useRuntimeStore().runtime.db.saveSession(session(`s${index}`, index))
    }

    const store = useSessionStore()
    await store.init()

    for (const id of ['s1', 's2', 's3', 's4', 's5', 's6', 's7']) {
      store.select(id)
      await store.ensureLoaded(id)
    }

    expect(Object.keys(store.sessionCache).length).toBe(5)
    expect(store.sessionCache.s1).toBeUndefined()
    expect(store.sessionCache.s2).toBeUndefined()
    expect(store.sessionCache.s7).toBeDefined()
    expect(store.activeId).toBe('s7')
  })

  it('newChat 只把 activeId 置空，不清缓存', async () => {
    await useRuntimeStore().runtime.db.saveSession(session('a', 1))

    const store = useSessionStore()
    await store.init()
    store.select('a')
    await store.ensureLoaded('a')

    store.newChat()

    expect(store.activeId).toBeNull()
    expect(store.sessionCache.a).toBeDefined()
  })
})
