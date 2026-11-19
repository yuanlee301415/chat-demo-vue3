import { describe, expect, it } from 'vitest'

import { formatSize, getFileExt, getUploadPurpose, isAcceptedExt, isImage, MAX_COUNT, resolveMimeType, validateFiles } from './attachments'

/** 只关心校验用到的字段，避免真的分配大文件。 */
const fakeFile = (name: string, size = 1, type = ''): File => ({ name, size, type }) as File

describe('validateFiles', () => {
  it('扩展名不在白名单时整批拒绝', () => {
    expect(validateFiles([fakeFile('a.exe')], 0)).toEqual({ key: 'uploadUnsupportedFormat' })
  })

  it('超过 user_data 上限时报出 MB 数', () => {
    expect(validateFiles([fakeFile('a.txt', 33 * 1024 * 1024)], 0)).toEqual({ key: 'uploadMaxMBSize', params: { size: 32 } })
  })

  it('数量超限时报出上限', () => {
    expect(validateFiles([fakeFile('a.txt')], MAX_COUNT)).toEqual({ key: 'uploadMaxFiles', params: { count: MAX_COUNT } })
  })

  it('合法文件返回 null', () => {
    expect(validateFiles([fakeFile('a.txt'), fakeFile('b.png', 1024, 'image/png')], 0)).toBeNull()
  })
})

describe('文件元信息', () => {
  it('扩展名与白名单判断', () => {
    expect(getFileExt('A.PNG')).toBe('png')
    expect(getFileExt('noext')).toBe('')
    expect(isAcceptedExt('a.txt')).toBe(true)
    expect(isAcceptedExt('a.exe')).toBe(false)
  })

  it('MIME 缺失时按扩展名补齐', () => {
    expect(resolveMimeType(fakeFile('a.png'))).toBe('image/png')
    expect(resolveMimeType(fakeFile('a.bin', 1, 'application/octet-stream'))).toBe('application/octet-stream')
    expect(isImage('image/png')).toBe(true)
  })

  it('按扩展名决定上传 purpose', () => {
    expect(getUploadPurpose('a.png', true)).toBeNull()
    expect(getUploadPurpose('a.pdf', false)).toBe('rich_layout_recognition')
    expect(getUploadPurpose('a.txt', false)).toBe('user_data')
  })

  it('文件大小格式化', () => {
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1536)).toBe('1.5 KB')
    expect(formatSize(10 * 1024 * 1024)).toBe('10 MB')
  })
})
