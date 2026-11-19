import { describe, expect, it } from 'vitest'

import { appendBranch, buildMessageVersions, getVisibleMessages, normalizeSession, selectVersion } from './branches'
import type { Message, Session } from './types'

/** 构造一条用户消息；parentId 默认挂在根下。 */
const user = (id: string, parentId: string | null = null, selectedChildId?: string): Message => ({
  id,
  role: 'user',
  content: id,
  files: [],
  createdAt: 1,
  parentId,
  selectedChildId,
})

/** 构造一条助手消息，默认已完成。 */
const reply = (id: string, parentId: string | null = null, selectedChildId?: string): Message => ({
  id,
  role: 'assistant',
  createdAt: 1,
  model: null,
  prefix: false,
  status: 'done',
  blocks: [],
  parentId,
  selectedChildId,
})

/** 构造一个最小会话。 */
const session = (messages: Message[], rootMessageId?: string | null): Session => ({
  id: 's',
  title: '会话',
  createdAt: 1,
  updatedAt: 1,
  messages,
  rootMessageId,
})

describe('normalizeSession', () => {
  it('把线性消息补成单分支链', () => {
    const normalized = normalizeSession(session([user('u1'), reply('a1')]))

    expect(normalized.rootMessageId).toBe('u1')
    expect(normalized.messages[0]).toMatchObject({ parentId: null, selectedChildId: 'a1' })
    expect(normalized.messages[1]).toMatchObject({ parentId: 'u1' })
    expect(normalized.messages[1]?.selectedChildId).toBeUndefined()
  })

  it('已有分支结构时原样返回', () => {
    const branched = session([user('u1', null, 'a1'), reply('a1', 'u1')], 'u1')

    expect(normalizeSession(branched)).toBe(branched)
  })
})

describe('getVisibleMessages', () => {
  it('按 selectedChildId 走当前分支', () => {
    const branched = session([user('u1', null, 'a2'), reply('a1', 'u1'), reply('a2', 'u1')], 'u1')

    expect(getVisibleMessages(branched).map((message) => message.id)).toEqual(['u1', 'a2'])
  })

  it('没有 rootMessageId 时按线性列表返回', () => {
    const linear = session([user('u1'), reply('a1')])

    expect(getVisibleMessages(linear).map((message) => message.id)).toEqual(['u1', 'a1'])
  })
})

describe('appendBranch', () => {
  it('在父节点下追加新分支并选中它', () => {
    const original = session([user('u1', null, 'a1'), reply('a1', 'u1')], 'u1')

    const next = appendBranch(original, 'a1', [user('u2')])

    expect(next.messages.find((message) => message.id === 'a1')?.selectedChildId).toBe('u2')
    expect(getVisibleMessages(next).map((message) => message.id)).toEqual(['u1', 'a1', 'u2'])
  })

  it('父节点为 null 时新消息成为新的根', () => {
    const original = session([user('u1', null, 'a1'), reply('a1', 'u1')], 'u1')

    const next = appendBranch(original, null, [user('u0')])

    expect(next.rootMessageId).toBe('u0')
    expect(getVisibleMessages(next).map((message) => message.id)).toEqual(['u0'])
  })
})

describe('selectVersion', () => {
  it('切换兄弟版本并恢复该分支的选择', () => {
    const branched = session([user('u1', null, 'a1'), reply('a1', 'u1'), reply('a2', 'u1')], 'u1')

    const next = selectVersion(branched, 'a2')

    expect(next.messages.find((message) => message.id === 'u1')?.selectedChildId).toBe('a2')
    expect(getVisibleMessages(next).map((message) => message.id)).toEqual(['u1', 'a2'])
  })

  it('拒绝不在当前路径上的版本', () => {
    const branched = session([user('u1', null, 'a1'), reply('a1', 'u1')], 'u1')

    expect(selectVersion(branched, 'a9')).toBe(branched)
  })
})

describe('buildMessageVersions', () => {
  it('结构未变时复用上一次的映射对象', () => {
    const branched = session([user('u1', null, 'a1'), reply('a1', 'u1'), reply('a2', 'u1')], 'u1')

    const first = buildMessageVersions(branched, new Map())
    const second = buildMessageVersions(branched, first)

    expect(second).toBe(first)
    expect(first.get('a1')?.ids).toEqual(['a1', 'a2'])
    expect(first.get('a1')?.index).toBe(0)
    expect(first.get('a2')?.index).toBe(1)
  })

  it('新增兄弟版本后返回新的映射', () => {
    const branched = session([user('u1', null, 'a1'), reply('a1', 'u1')], 'u1')
    const previous = buildMessageVersions(branched, new Map())

    const grown = session([...branched.messages, reply('a2', 'u1')], 'u1')
    const next = buildMessageVersions(grown, previous)

    expect(next).not.toBe(previous)
    expect(next.get('a2')).toMatchObject({ ids: ['a1', 'a2'], index: 1 })
  })
})
