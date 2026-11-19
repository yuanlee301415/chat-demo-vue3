import { describe, expect, it } from 'vitest'

import { sanitizeUrl } from './url'

describe('sanitizeUrl', () => {
  it('没有协议时补 https', () => {
    expect(sanitizeUrl('example.com/a')).toBe('https://example.com/a')
  })

  it('保留 http / https / mailto', () => {
    expect(sanitizeUrl('http://example.com/')).toBe('http://example.com/')
    expect(sanitizeUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1')
    expect(sanitizeUrl('mailto:a@example.com')).toBe('mailto:a@example.com')
  })

  it('拒绝其他协议与无法解析的地址', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeUndefined()
    expect(sanitizeUrl('data:text/html,hi')).toBeUndefined()
    expect(sanitizeUrl('')).toBeUndefined()
  })
})
