import { describe, expect, it } from 'vitest'

import { getRegionName, normalizeLocation, provinces } from './location'

describe('location', () => {
  it('省市按行政区划代码前缀归属', () => {
    const zhejiang = provinces.find((province) => province.code === '330000')

    expect(zhejiang?.name).toBe('浙江省')
    expect(zhejiang?.cities.some((city) => city.name === '杭州市')).toBe(true)
  })

  it('地区名使用固定中文名称', () => {
    expect(getRegionName('TW')).toBe('中国台湾')
    expect(getRegionName('CN')).toBe('中国')
    expect(getRegionName('XX')).toBe('')
  })

  it('normalizeLocation 接受合法位置', () => {
    expect(normalizeLocation({ region: 'CN', province: '330000', city: '330100' })).toEqual({ region: 'CN', province: '330000', city: '330100' })
    expect(normalizeLocation({ region: 'JP' })).toEqual({ region: 'JP' })
    expect(normalizeLocation({ region: 'CN' })).toEqual({ region: 'CN' })
  })

  it('normalizeLocation 拒绝非法结构', () => {
    expect(normalizeLocation(null)).toBeNull()
    expect(normalizeLocation('CN')).toBeNull()
    expect(normalizeLocation({ region: 'XX' })).toBeNull()
    expect(normalizeLocation({ region: 'CN', province: '999999' })).toBeNull()
    expect(normalizeLocation({ region: 'CN', province: '330000', city: '110100' })).toBeNull()
    expect(normalizeLocation({ region: 'CN', city: '330100' })).toBeNull()
    expect(normalizeLocation({ region: 'JP', province: '330000' })).toEqual({ region: 'JP' })
  })
})
