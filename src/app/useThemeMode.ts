import { computed, onScopeDispose, ref } from 'vue'

import type { IconName } from '../components/base/iconNames'

/** 跟随系统 / 浅色 / 深色；与计划 §3.6 的 localStorage 键一致，Phase 2 的 settings store 接管后沿用。 */
export type ThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'chat-demo-vue:theme'
const ORDER: readonly ThemeMode[] = ['system', 'light', 'dark']

const LABELS: Record<ThemeMode, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
}

const ICONS: Record<ThemeMode, IconName> = {
  system: 'follow-system',
  light: 'light',
  dark: 'dark',
}

const isThemeMode = (value: unknown): value is ThemeMode => value === 'system' || value === 'light' || value === 'dark'

const readStoredMode = (): ThemeMode => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isThemeMode(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export const useThemeMode = () => {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const systemPrefersDark = ref(query.matches)
  const mode = ref<ThemeMode>(readStoredMode())

  const handleSystemChange = (event: MediaQueryListEvent) => {
    systemPrefersDark.value = event.matches
  }

  query.addEventListener('change', handleSystemChange)
  onScopeDispose(() => query.removeEventListener('change', handleSystemChange))

  const isDark = computed(() => (mode.value === 'system' ? systemPrefersDark.value : mode.value === 'dark'))
  const label = computed(() => LABELS[mode.value])
  const icon = computed<IconName>(() => ICONS[mode.value])

  const setMode = (next: ThemeMode) => {
    mode.value = next
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* 隐私模式下写不进去就只在本次会话生效 */
    }
  }

  const cycle = () => {
    const index = ORDER.indexOf(mode.value)
    setMode(ORDER[(index + 1) % ORDER.length])
  }

  return { mode, isDark, label, icon, setMode, cycle }
}
