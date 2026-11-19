import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import type { Source } from '../services/chat/view'
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
})
