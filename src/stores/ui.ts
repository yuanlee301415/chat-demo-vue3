import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

import type { Source } from '../services/chat/view'
import { useSettingsStore } from './settings'

/** 设置弹窗的分组：通用设置 / 数据管理 */
export type SettingsSection = 'general' | 'data'

/**
 * 全局浮层状态：右侧「搜索结果」面板与设置弹窗。
 * 面板入口 key 用于「同一入口再次点击收起」，换入口时替换内容；切换会话由调用方关闭。
 */
export const useUiStore = defineStore('ui', () => {
  /** 当前打开面板的入口；null 表示关闭 */
  const searchPanelEntry = shallowRef<string | null>(null)
  /** 面板要展示的来源，顺序由打开它的入口决定 */
  const searchPanelSources = shallowRef<Source[]>([])

  /** 设置弹窗是否打开 */
  const settingsOpen = shallowRef(false)
  /** 设置弹窗打开时选中的分组 */
  const settingsSection = shallowRef<SettingsSection>('general')

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

  /** 打开设置弹窗并选中分组。 */
  const openSettings = (section: SettingsSection = 'general') => {
    settingsSection.value = section
    settingsOpen.value = true
  }

  /** 关闭设置弹窗；分组保留，下次打开沿用。 */
  const closeSettings = () => {
    settingsOpen.value = false
  }

  /** 切换设置分组。 */
  const setSettingsSection = (section: SettingsSection) => {
    settingsSection.value = section
  }

  /** 没有 API Key 时打开「数据管理」并返回 false；已有 Key 直接返回 true。 */
  const ensureApiKey = (): boolean => {
    if (useSettingsStore().apiKey !== null) {
      return true
    }
    openSettings('data')
    return false
  }

  return {
    searchPanelEntry,
    searchPanelSources,
    searchPanelOpen,
    settingsOpen,
    settingsSection,
    toggleSearchPanel,
    closeSearchPanel,
    isSearchPanelOpen,
    openSettings,
    closeSettings,
    setSettingsSection,
    ensureApiKey,
  }
})
