import { computed, onScopeDispose, shallowRef } from 'vue'

import type { IconName } from '../components/base/iconNames'
import { useSettingsStore, type ThemePreference } from '../stores/settings'

const ORDER: readonly ThemePreference[] = ['system', 'light', 'dark']

const ICONS: Record<ThemePreference, IconName> = {
  system: 'follow-system',
  light: 'light',
  dark: 'dark',
}

/**
 * 主题偏好存在 settings store（键前缀由 `APP_NAMESPACE` 派生），
 * 这里只负责系统偏好监听与三态循环，避免两处各存一份状态。
 */
export const useThemeMode = () => {
  const settings = useSettingsStore()
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const systemPrefersDark = shallowRef(query.matches)

  const handleSystemChange = (event: MediaQueryListEvent) => {
    systemPrefersDark.value = event.matches
  }

  query.addEventListener('change', handleSystemChange)
  onScopeDispose(() => query.removeEventListener('change', handleSystemChange))

  const theme = computed(() => settings.theme)
  const isDark = computed(() => (settings.theme === 'system' ? systemPrefersDark.value : settings.theme === 'dark'))
  const icon = computed<IconName>(() => ICONS[settings.theme])

  const cycle = () => {
    const index = ORDER.indexOf(settings.theme)
    settings.setTheme(ORDER[(index + 1) % ORDER.length])
  }

  return { theme, isDark, icon, cycle, setTheme: settings.setTheme }
}
