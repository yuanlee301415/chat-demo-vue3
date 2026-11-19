import type { GlobalThemeOverrides } from 'naive-ui'

/**
 * 主色取自 DeepSeek 站点蓝。
 * P0-02 只作草案：仅覆盖主色与圆角，最终视觉在 Phase 4 定稿。
 */
export const PRIMARY_COLOR = '#4d6bfe'

/**
 * NaiveUI 主题覆盖：主色与圆角。
 * 主色以 `PRIMARY_COLOR` 为唯一来源；其余色阶由它派生，Phase 4 再定稿。
 *
 * @see PRIMARY_COLOR 主色唯一来源
 */
export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: PRIMARY_COLOR,
    primaryColorHover: '#6b83fe',
    primaryColorPressed: '#3f59e6',
    primaryColorSuppl: '#6b83fe',
    borderRadius: '8px',
    borderRadiusSmall: '6px',
  },
}
