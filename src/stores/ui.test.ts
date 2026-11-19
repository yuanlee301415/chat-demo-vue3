import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Source } from '../services/chat/view'
import { useSettingsStore } from './settings'
import { useUiStore } from './ui'

/** 造一个来源；只关心编号与地址。 */
const source = (index: number, url: string): Source => ({ url, title: url, siteName: '', publishedAt: null, snippet: null, siteIcon: null, index })

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('ui store', () => {
  it('默认关闭且没有来源', () => {
    const ui = useUiStore()

    expect(ui.searchPanelOpen).toBe(false)
    expect(ui.searchPanelEntry).toBeNull()
    expect(ui.searchPanelSources).toEqual([])
  })

  it('同一入口再次点击收起', () => {
    const ui = useUiStore()
    const sources = [source(1, 'https://a.example')]

    ui.toggleSearchPanel('message-1', sources)
    expect(ui.searchPanelOpen).toBe(true)
    expect(ui.isSearchPanelOpen('message-1')).toBe(true)
    expect(ui.searchPanelSources).toBe(sources)

    ui.toggleSearchPanel('message-1', sources)
    expect(ui.searchPanelOpen).toBe(false)
    expect(ui.searchPanelSources).toEqual([])
  })

  it('换入口时替换内容', () => {
    const ui = useUiStore()
    const first = [source(1, 'https://a.example')]
    const second = [source(1, 'https://b.example'), source(2, 'https://c.example')]

    ui.toggleSearchPanel('message-1', first)
    ui.toggleSearchPanel('message-2', second)

    expect(ui.isSearchPanelOpen('message-1')).toBe(false)
    expect(ui.isSearchPanelOpen('message-2')).toBe(true)
    expect(ui.searchPanelSources).toBe(second)
  })

  it('closeSearchPanel 关闭并清空内容', () => {
    const ui = useUiStore()
    ui.toggleSearchPanel('message-1', [source(1, 'https://a.example')])

    ui.closeSearchPanel()

    expect(ui.searchPanelOpen).toBe(false)
    expect(ui.searchPanelSources).toEqual([])
  })

  it('设置弹窗记录打开分组，关闭后保留分组', () => {
    const ui = useUiStore()

    expect(ui.settingsOpen).toBe(false)
    ui.openSettings('data')
    expect(ui.settingsOpen).toBe(true)
    expect(ui.settingsSection).toBe('data')

    ui.setSettingsSection('general')
    ui.closeSettings()

    expect(ui.settingsOpen).toBe(false)
    expect(ui.settingsSection).toBe('general')
  })

  it('ensureApiKey 没有 Key 时打开数据页，有 Key 时不打开弹窗', () => {
    const ui = useUiStore()
    const settings = useSettingsStore()

    expect(ui.ensureApiKey()).toBe(false)
    expect(ui.settingsOpen).toBe(true)
    expect(ui.settingsSection).toBe('data')

    ui.closeSettings()
    settings.setApiKey('sk-test')

    expect(ui.ensureApiKey()).toBe(true)
    expect(ui.settingsOpen).toBe(false)
  })
})
