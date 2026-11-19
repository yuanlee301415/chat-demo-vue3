import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import { APP_NAMESPACE } from '../services/appNamespace'

/** 主题偏好：跟随系统 / 浅色 / 深色。 */
export type ThemePreference = 'system' | 'light' | 'dark'

/** 与计划 §3.6 一致；前缀由 `APP_NAMESPACE` 派生，旧 `chat-demo:` 的数据不再读取。 */
const PREFIX = `${APP_NAMESPACE}:`

const KEYS = {
  apiKey: `${PREFIX}api-key`,
  theme: `${PREFIX}theme`,
  thinking: `${PREFIX}thinking`,
  search: `${PREFIX}search`,
  siderCollapsed: `${PREFIX}sider-collapsed`,
} as const

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } catch {
    // 存储不可用时只在本次会话生效。
  }
}

const isThemePreference = (value: string | null): value is ThemePreference => value === 'system' || value === 'light' || value === 'dark'

const readTheme = (): ThemePreference => {
  const saved = read(KEYS.theme)
  return isThemePreference(saved) ? saved : 'system'
}

/**
 * 本机设置（localStorage）。语言固定中文、语音已移除，因此不再有 `locale`/`ttsVoice`。
 * 写操作统一走 action，组件不要直接改 state。
 */
export const useSettingsStore = defineStore('settings', () => {
  const apiKey = shallowRef<string | null>(read(KEYS.apiKey))
  const theme = shallowRef<ThemePreference>(readTheme())
  const thinking = shallowRef(read(KEYS.thinking) === 'true')
  const search = shallowRef(read(KEYS.search) === 'true')
  const siderCollapsed = shallowRef(read(KEYS.siderCollapsed) === 'true')

  const setApiKey = (value: string | null) => {
    write(KEYS.apiKey, value)
    apiKey.value = value
  }

  const setTheme = (value: ThemePreference) => {
    write(KEYS.theme, value)
    theme.value = value
  }

  const setThinking = (value: boolean) => {
    write(KEYS.thinking, String(value))
    thinking.value = value
  }

  const setSearch = (value: boolean) => {
    write(KEYS.search, String(value))
    search.value = value
  }

  const setSiderCollapsed = (value: boolean) => {
    write(KEYS.siderCollapsed, String(value))
    siderCollapsed.value = value
  }

  return {
    apiKey,
    theme,
    thinking,
    search,
    siderCollapsed,
    setApiKey,
    setTheme,
    setThinking,
    setSearch,
    setSiderCollapsed,
  }
})
