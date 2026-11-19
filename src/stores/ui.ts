import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

import type { Source } from '../services/chat/view'

/**
 * 全局浮层状态：右侧「搜索结果」面板。
 * 入口 key 用于「同一入口再次点击收起」，换入口时替换内容；切换会话由调用方关闭。
 */
export const useUiStore = defineStore('ui', () => {
  /** 当前打开面板的入口；null 表示关闭 */
  const searchPanelEntry = shallowRef<string | null>(null)
  /** 面板要展示的来源，顺序由打开它的入口决定 */
  const searchPanelSources = shallowRef<Source[]>([])

  /** 面板是否打开。 */
  const searchPanelOpen = computed(() => searchPanelEntry.value !== null)

  /** 切换面板：同一入口再次点击收起，换入口时替换内容。 */
  const toggleSearchPanel = (entry: string, sources: Source[]) => {
    if (searchPanelEntry.value === entry) {
      searchPanelEntry.value = null
      searchPanelSources.value = []
      return
    }
    searchPanelEntry.value = entry
    searchPanelSources.value = sources
  }

  /** 关闭面板并清空内容。 */
  const closeSearchPanel = () => {
    searchPanelEntry.value = null
    searchPanelSources.value = []
  }

  /** 该入口是否正打开。 */
  const isSearchPanelOpen = (entry: string) => searchPanelEntry.value === entry

  return {
    searchPanelEntry,
    searchPanelSources,
    searchPanelOpen,
    toggleSearchPanel,
    closeSearchPanel,
    isSearchPanelOpen,
  }
})
