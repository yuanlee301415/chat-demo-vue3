import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSettingsStore } from './settings'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('settings store', () => {
  it('未保存过时给出默认值', () => {
    const settings = useSettingsStore()

    expect(settings.apiKey).toBeNull()
    expect(settings.theme).toBe('system')
    expect(settings.location).toBeNull()
    expect(settings.thinking).toBe(false)
    expect(settings.search).toBe(false)
    expect(settings.siderCollapsed).toBe(false)
  })

  it('setTheme 更新状态；node 环境没有 localStorage 也不抛错', () => {
    const settings = useSettingsStore()

    expect(() => settings.setTheme('dark')).not.toThrow()
    expect(settings.theme).toBe('dark')
  })

  it('开关类设置可写', () => {
    const settings = useSettingsStore()

    settings.setThinking(true)
    settings.setSearch(true)
    settings.setSiderCollapsed(true)
    settings.setApiKey('sk-test')

    expect(settings.thinking).toBe(true)
    expect(settings.search).toBe(true)
    expect(settings.siderCollapsed).toBe(true)
    expect(settings.apiKey).toBe('sk-test')
  })

  it('setLocation 规范化后写入，传 null 清除', () => {
    const settings = useSettingsStore()

    settings.setLocation({ region: 'CN', province: '330000', city: '330100' })

    expect(settings.location).toEqual({ region: 'CN', province: '330000', city: '330100' })

    settings.setLocation(null)

    expect(settings.location).toBeNull()
  })
})
