import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { createChatDB } from './db'
import type { FileAttachment, Session } from './types'

/** 构造一个本地附件引用。 */
const attachment = (id: string): FileAttachment => ({
  id,
  serverId: null,
  name: `${id}.txt`,
  size: 3,
  isImage: false,
  mimeType: 'text/plain',
})

/** 构造带可选附件的最小会话。 */
const session = (id: string, files: FileAttachment[] = []): Session => ({
  id,
  title: `会话 ${id}`,
  createdAt: 1,
  updatedAt: 1,
  messages: files.length === 0 ? [] : [{ id: `${id}-msg`, role: 'user', content: '你好', files, createdAt: 1 }],
})

/** 构造一个待写入的原件。 */
const storedBlob = (text: string) => ({ id: 'blob', blob: new Blob([text]) })

let db = createChatDB()

beforeEach(async () => {
  db = createChatDB()
  await db.clearAllSessions()
})

describe('chat db', () => {
  it('保存会话后可读到摘要与详情', async () => {
    await db.saveSession(session('a'))

    expect(await db.loadSessionSummaries()).toEqual([{ id: 'a', title: '会话 a', createdAt: 1, updatedAt: 1 }])
    expect((await db.loadSession('a'))?.title).toBe('会话 a')
  })

  it('重命名同时更新摘要', async () => {
    await db.saveSession(session('a'))
    await db.renameSession('a', '新标题')

    expect((await db.loadSession('a'))?.title).toBe('新标题')
    expect((await db.loadSessionSummaries())[0]?.title).toBe('新标题')
  })

  it('删除会话只清理无人引用的原件', async () => {
    const shared = attachment('f1')
    const own = attachment('f2')
    await db.saveFiles([
      { id: 'f1', blob: new Blob(['one']) },
      { id: 'f2', blob: new Blob(['two']) },
    ])
    await db.saveSession(session('s1', [shared]))
    await db.saveSession(session('s2', [shared, own]))

    await db.deleteSession('s1')
    expect(await db.loadFile('f1')).toBeDefined()
    expect((await db.loadSessionSummaries()).map((item) => item.id)).toEqual(['s2'])

    await db.deleteSession('s2')
    expect(await db.loadFile('f1')).toBeUndefined()
    expect(await db.loadFile('f2')).toBeUndefined()
    expect(await db.loadSessionSummaries()).toEqual([])
  })

  it('清空全部会话与原件', async () => {
    await db.saveSession(session('a'), [storedBlob('x')])
    await db.clearAllSessions()

    expect(await db.loadSessionSummaries()).toEqual([])
    expect(await db.loadSession('a')).toBeUndefined()
    expect(await db.loadFile('blob')).toBeUndefined()
  })

  it('原件可以往返读取', async () => {
    await db.saveFiles([{ id: 'f3', blob: new Blob(['hello']) }])
    expect(await (await db.loadFile('f3'))?.text()).toBe('hello')
  })
})
