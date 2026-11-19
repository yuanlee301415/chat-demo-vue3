import { describe, expect, it } from 'vitest'

import { createLatestReminder } from './latestReminder'

describe('createLatestReminder', () => {
  it('按 日期,星期,地区,平台,语言 拼出五项', () => {
    expect(createLatestReminder(new Date(2026, 10, 19, 10, 0, 0))).toBe('2026-11-19,星期四,,Web,中文')
  })
})
