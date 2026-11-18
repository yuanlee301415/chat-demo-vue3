import { describe, expect, it } from 'vitest'

import { isTranslationKey, t, useI18n } from './index'
import { zh } from './zh'

describe('i18n', () => {
  it('所有文案都是非空字符串', () => {
    const empty = Object.entries(zh).filter(([, value]) => value.trim() === '')
    expect(empty).toEqual([])
  })

  it('返回中文文案', () => {
    expect(t('welcomeMessageChat250808')).toBe('今天有什么可以帮到你？')
  })

  it('替换占位符', () => {
    expect(t('messageSearchSummaries', { count: 3 })).toBe('3 个网页')
    expect(t('uploadRetry', { message: '上传失败' })).toBe('上传失败，点击重试')
  })

  it('缺参时保留占位符而不是输出 undefined', () => {
    expect(t('messageSearchSummaries')).toBe('{count} 个网页')
  })

  it('isTranslationKey 只认已知键', () => {
    expect(isTranslationKey('welcomeMessageChat250808')).toBe(true)
    expect(isTranslationKey('notAKey')).toBe(false)
    expect(isTranslationKey(undefined)).toBe(false)
  })

  it('useI18n 暴露同一个 t', () => {
    expect(useI18n().t).toBe(t)
  })
})
