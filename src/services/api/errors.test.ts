import { describe, expect, it } from 'vitest'

import { ApiError } from './ApiError'
import { classifyApiError, classifyStatus, extractFileIds, getFileErrorCode, getUploadErrorInfo, isRetryableApiError } from './errors'

describe('classifyStatus', () => {
  it('按状态码归类', () => {
    expect(classifyStatus(401)).toBe('unauthorized')
    expect(classifyStatus(402)).toBe('insufficientBalance')
    expect(classifyStatus(413)).toBe('tooLarge')
    expect(classifyStatus(429)).toBe('rateLimited')
    expect(classifyStatus(500)).toBe('serverBusy')
    expect(classifyStatus(503)).toBe('serverBusy')
    expect(classifyStatus(418)).toBe('other')
    expect(classifyStatus(undefined)).toBe('other')
  })
})

describe('classifyApiError', () => {
  it('非 ApiError 一律 other', () => {
    expect(classifyApiError(new Error('boom'))).toBe('other')
    expect(classifyApiError('boom')).toBe('other')
  })

  it('没有状态码时按网络错误处理', () => {
    expect(classifyApiError(new ApiError('network', '断网'))).toBe('network')
    expect(classifyApiError(new ApiError('protocol', '协议错误'))).toBe('other')
  })

  it('有状态码时按状态码归类', () => {
    expect(classifyApiError(new ApiError('http', '鉴权失败', 401))).toBe('unauthorized')
    expect(classifyApiError(new ApiError('http', '限流', 429))).toBe('rateLimited')
  })
})

describe('isRetryableApiError', () => {
  it('网络、限流、服务端繁忙可重试', () => {
    expect(isRetryableApiError(new ApiError('network', '断网'))).toBe(true)
    expect(isRetryableApiError(new ApiError('http', '限流', 429))).toBe(true)
    expect(isRetryableApiError(new ApiError('http', '繁忙', 503))).toBe(true)
  })

  it('鉴权与参数错误不重试；非 ApiError 默认可重试', () => {
    expect(isRetryableApiError(new ApiError('http', '鉴权', 401))).toBe(false)
    expect(isRetryableApiError(new ApiError('http', '参数', 400))).toBe(false)
    expect(isRetryableApiError(new Error('boom'))).toBe(true)
  })
})

describe('getFileErrorCode', () => {
  it('识别三类附件失效 400', () => {
    expect(getFileErrorCode(new ApiError('http', 'file_ids do not exist or are not created under your account', 400))).toBe('fileIdMissing')
    expect(getFileErrorCode(new ApiError('http', 'file data not found for file_id: x', 400))).toBe('fileDataMissing')
    expect(getFileErrorCode(new ApiError('http', 'messages.0.content.0.source.file_id: invalid file_id', 400))).toBe('invalidFileId')
  })

  it('非 400 或无关文案返回 null', () => {
    expect(getFileErrorCode(new ApiError('http', 'file_ids do not exist', 401))).toBeNull()
    expect(getFileErrorCode(new ApiError('http', 'rate limited', 400))).toBeNull()
    expect(getFileErrorCode(new Error('boom'))).toBeNull()
  })
})

describe('extractFileIds', () => {
  it('取出并去重 file-api- 前缀的 ID', () => {
    expect(extractFileIds('bad file file-api-abc and file-api-abc, also file-api-def')).toEqual(['file-api-abc', 'file-api-def'])
    expect(extractFileIds('no ids here')).toEqual([])
  })
})

describe('getUploadErrorInfo', () => {
  it('识别配额类错误并带上限值', () => {
    expect(getUploadErrorInfo(new ApiError('http', 'User file count limit exceeded, limit 100', 400))).toEqual({
      code: 'fileCountLimit',
      limit: '100',
    })
    expect(getUploadErrorInfo(new ApiError('http', 'User storage quota exceeded, limit 2.5 GB', 400))).toEqual({
      code: 'storageLimit',
      limit: '2.5',
    })
  })

  it('识别解析失败', () => {
    expect(getUploadErrorInfo(new ApiError('http', 'Failed to recognize the file', 400))).toEqual({
      code: 'parseFailed',
    })
  })

  it('其他 400 与非 400 返回 null', () => {
    expect(getUploadErrorInfo(new ApiError('http', 'something else', 400))).toBeNull()
    expect(getUploadErrorInfo(new ApiError('http', 'Failed to recognize the file', 500))).toBeNull()
    expect(getUploadErrorInfo(new Error('boom'))).toBeNull()
  })
})
