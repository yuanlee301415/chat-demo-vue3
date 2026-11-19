import { describe, expect, it } from 'vitest'

import { createLatestReminder } from './latestReminder'

describe('createLatestReminder', () => {
  it('未设置位置时地区为空', () => {
    expect(createLatestReminder(null, new Date(2026, 10, 19, 10, 0, 0))).toBe('2026-11-19,星期四,,Web,中文')
  })

  it('中国位置优先使用城市名，其次是省份名', () => {
    expect(createLatestReminder({ region: 'CN', province: '330000', city: '330100' }, new Date(2026, 10, 19, 10, 0, 0))).toBe('2026-11-19,星期四,杭州市,Web,中文')
    expect(createLatestReminder({ region: 'CN', province: '330000' }, new Date(2026, 10, 19, 10, 0, 0))).toBe('2026-11-19,星期四,浙江省,Web,中文')
  })

  it('其他国家使用中文地区名', () => {
    expect(createLatestReminder({ region: 'JP' }, new Date(2026, 10, 19, 10, 0, 0))).toBe('2026-11-19,星期四,日本,Web,中文')
  })
})
