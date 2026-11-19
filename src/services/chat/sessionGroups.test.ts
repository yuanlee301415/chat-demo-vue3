import { describe, expect, it } from 'vitest'

import { groupSessions } from './sessionGroups'
import type { SessionSummary } from './types'

const DAY = 86_400_000
const NOW = new Date(2026, 10, 19, 12).getTime()

/** 构造一条只关心更新时间的摘要。 */
const summary = (id: string, updatedAt: number): SessionSummary => ({ id, title: id, createdAt: updatedAt, updatedAt })

describe('groupSessions', () => {
  it('按今天/昨天/7 天/30 天/月份分段', () => {
    const groups = groupSessions([summary('a', NOW), summary('b', NOW - DAY), summary('c', NOW - 3 * DAY), summary('d', NOW - 10 * DAY), summary('e', NOW - 40 * DAY)], NOW)

    expect(groups.map((group) => group.label)).toEqual(['今天', '昨天', '7 天内', '30 天内', '2026-10'])
    expect(groups.map((group) => group.sessions.map((session) => session.id))).toEqual([['a'], ['b'], ['c'], ['d'], ['e']])
  })

  it('相邻且同段的会话合并进同一组', () => {
    const groups = groupSessions([summary('a', NOW), summary('b', NOW - 1000)], NOW)

    expect(groups).toHaveLength(1)
    expect(groups[0].sessions.map((session) => session.id)).toEqual(['a', 'b'])
  })
})
