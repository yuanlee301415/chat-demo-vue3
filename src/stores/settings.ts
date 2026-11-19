import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import { APP_NAMESPACE } from '../services/appNamespace'
import { isChineseBrowser, normalizeLocation, type UserLocation } from '../services/location'

/** 主题偏好：跟随系统 / 浅色 / 深色。 */
export type ThemePreference = 'system' | 'light' | 'dark'

/**
 * 与计划 §3.6 一致；前缀由 `APP_NAMESPACE` 派生，旧 `chat-demo:` 的数据不再读取。
 *
 * @see APP_NAMESPACE 命名空间的唯一来源
 */
const PREFIX = `${APP_NAMESPACE}:`

const KEYS = {
  apiKey: `${PREFIX}api-key`,
  theme: `${PREFIX}theme`,
  location: `${PREFIX}location`,
  thinking: `${PREFIX}thinking`,
  search: `${PREFIX}search`,
  siderCollapsed: `${PREFIX}sider-collapsed`,
} as const

/** 读 localStorage；不可用时返回 null。 */
const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** 写或删除 localStorage；不可用时静默失败。 */
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

/** 判断是否是合法主题取值。 */
const isThemePreference = (value: string | null): value is ThemePreference => value === 'system' || value === 'light' || value === 'dark'

/** 读取主题偏好，缺省或非法时回退跟随系统。 */
const readTheme = (): ThemePreference => {
  const saved = read(KEYS.theme)
  return isThemePreference(saved) ? saved : 'system'
}

/**
 * 读取位置：中文浏览器要求选到省份，其他浏览器只保留国家/地区，
 * 避免浏览器语言变化后留下界面上看不到的省/市选择。
 */
const readLocation = (): UserLocation | null => {
  try {
    const location = normalizeLocation(JSON.parse(read(KEYS.location) ?? 'null'))
    if (location === null) {
      return null
    }
    return isChineseBrowser() ? (location.region === 'CN' && location.province ? location : null) : { region: location.region }
  } catch {
    return null
  }
}

/**
 * 本机设置（localStorage）。语言固定中文、语音已移除，因此不再有 `locale`/`ttsVoice`。
 * 写操作统一走 action，组件不要直接改 state。
 */
export const useSettingsStore = defineStore('settings', () => {
  const apiKey = shallowRef<string | null>(read(KEYS.apiKey))
  const theme = shallowRef<ThemePreference>(readTheme())
  const location = shallowRef<UserLocation | null>(readLocation())
  const thinking = shallowRef(read(KEYS.thinking) === 'true')
  const search = shallowRef(read(KEYS.search) === 'true')
  const siderCollapsed = shallowRef(read(KEYS.siderCollapsed) === 'true')

  /** 更新 API Key 并持久化。 */
  const setApiKey = (value: string | null) => {
    write(KEYS.apiKey, value)
    apiKey.value = value
  }

  /** 更新主题偏好并持久化。 */
  const setTheme = (value: ThemePreference) => {
    write(KEYS.theme, value)
    theme.value = value
  }

  /** 更新位置并持久化；非法位置按清除处理。 */
  const setLocation = (value: UserLocation | null) => {
    const locationValue = normalizeLocation(value)
    write(KEYS.location, locationValue === null ? null : JSON.stringify(locationValue))
    location.value = locationValue
  }

  /** 更新深度思考开关并持久化。 */
  const setThinking = (value: boolean) => {
    write(KEYS.thinking, String(value))
    thinking.value = value
  }

  /** 更新智能搜索开关并持久化。 */
  const setSearch = (value: boolean) => {
    write(KEYS.search, String(value))
    search.value = value
  }

  /** 更新侧栏折叠状态并持久化。 */
  const setSiderCollapsed = (value: boolean) => {
    write(KEYS.siderCollapsed, String(value))
    siderCollapsed.value = value
  }

  return {
    apiKey,
    theme,
    location,
    thinking,
    search,
    siderCollapsed,
    setApiKey,
    setTheme,
    setLocation,
    setThinking,
    setSearch,
    setSiderCollapsed,
  }
})
