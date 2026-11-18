import { describe, expect, it } from 'vitest'

import { PRIMARY_COLOR, themeOverrides } from './theme'

describe('themeOverrides', () => {
  it('主色是合法的十六进制颜色', () => {
    expect(PRIMARY_COLOR).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('主色与圆角写在 common 上', () => {
    expect(themeOverrides.common?.primaryColor).toBe(PRIMARY_COLOR)
    expect(themeOverrides.common?.borderRadius).toBe('8px')
  })
})
