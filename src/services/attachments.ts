import type { LinkedMessage, TranslationMessage } from '../i18n'
import { classifyApiError, getUploadErrorInfo, isRetryableApiError } from './api/errors'
import type { FilePurpose } from './api/types'
import { ACCEPT_FILE_EXTS } from './uploadExts'

/** 允许上传的扩展名，按扩展名白名单过滤，清单见 `uploadExts.ts`。 */
export const ACCEPTED_EXTS = ACCEPT_FILE_EXTS
/** 选择文件对话框的过滤条件。 */
export const ACCEPT = ACCEPTED_EXTS.map((ext) => `.${ext}`).join(',')
/** 单文件大小上限（MB），与 Files API 一致。 */
export const MAX_SIZE_MB = 64
/** 按 user_data 上传的文件原文件上限更小。 */
export const MAX_USER_DATA_SIZE_MB = 32
/** 单条消息可附带的文件数上限。 */
export const MAX_COUNT = 50

/** 文件扩展名（小写、不含点）；没有扩展名时为空。 */
export const getFileExt = (name: string): string => {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** 扩展名是否在白名单里。 */
export const isAcceptedExt = (name: string): boolean => ACCEPTED_EXTS.includes(getFileExt(name))

/** 需要服务端做版面解析的文档；其余非图片文件无需解析。 */
const LAYOUT_RECOGNITION_EXTS = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx'])

/** 上传时的 purpose：图片不传，PDF 与 Word、PPT 做版面解析，其余按 user_data 上传。 */
export const getUploadPurpose = (name: string, isImage: boolean): FilePurpose | null => {
  if (isImage) {
    return null
  }
  return LAYOUT_RECOGNITION_EXTS.has(getFileExt(name)) ? 'rich_layout_recognition' : 'user_data'
}

/** 各扩展名对应的 MIME：部分系统（如 Windows）给不出 `file.type`，按扩展名补齐。 */
const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
}

/** 取文件的 MIME：优先用浏览器给出的类型，缺失时按扩展名推断。 */
export const resolveMimeType = (file: File): string => file.type || MIME_BY_EXT[getFileExt(file.name)] || ''

/** MIME 是否属于图片。 */
export const isImage = (mimeType: string): boolean => mimeType.startsWith('image/')

/** 文件扩展名（大写），用于卡片元信息。 */
export const getExtension = (name: string): string => {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : ''
}

/** 人类可读的文件大小。 */
export const formatSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}

/** 文件允许的最大体积（MB），按上传时的 purpose 区分。 */
const getMaxSizeMB = (file: File): number => (getUploadPurpose(file.name, isImage(resolveMimeType(file))) === 'user_data' ? MAX_USER_DATA_SIZE_MB : MAX_SIZE_MB)

/** 添加前校验：格式 → 大小 → 数量，任一不满足即整批不添加。 */
export const validateFiles = (files: File[], currentCount: number): TranslationMessage | null => {
  if (files.some((file) => !isAcceptedExt(file.name))) {
    return { key: 'uploadUnsupportedFormat' }
  }
  const oversized = files.find((file) => file.size > getMaxSizeMB(file) * 1024 * 1024)
  if (oversized) {
    return { key: 'uploadMaxMBSize', params: { size: getMaxSizeMB(oversized) } }
  }
  if (currentCount + files.length > MAX_COUNT) {
    return { key: 'uploadMaxFiles', params: { count: MAX_COUNT } }
  }
  return null
}

/** 上传失败时附件上显示的文案：具体原因优先，其余统一「上传失败」。 */
export const describeUploadError = (error: unknown): TranslationMessage => {
  if (classifyApiError(error) === 'serverBusy') {
    return { key: 'uploadServerBusy' }
  }
  if (getUploadErrorInfo(error)?.code === 'parseFailed') {
    return { key: 'uploadParseFailed' }
  }
  return { key: 'uploadFileStatusFailed' }
}

/** 上传任务状态；`serverId` 只有成功时才有。 */
export type UploadTask =
  | {
      /** 上传中 */
      status: 'uploading'
    }
  | {
      /** 已成功 */
      status: 'done'
      /** Files API 返回的 file_id */
      serverId: string
    }
  | {
      /** 失败 */
      status: 'error'
      /** 可直接展示的失败文案 */
      error: TranslationMessage
      /** 重新上传是否可能成功 */
      retryable: boolean
    }

/** 删除已上传文件的接口文档。 */
const DELETE_FILE_DOCS_URL = 'https://api-docs.deepseek.com/api/delete-file'

/** 文件数或存储空间达到上限：附件上只放「上传失败」，原因另用 toast 说明。 */
export const describeUploadQuota = (error: unknown): LinkedMessage | undefined => {
  const info = getUploadErrorInfo(error)
  const link = { key: 'uploadDeleteFiles', href: DELETE_FILE_DOCS_URL } as const
  if (info?.code === 'fileCountLimit') {
    return { type: 'error', key: 'uploadFileCountLimit', params: { limit: info.limit ?? '' }, link }
  }
  if (info?.code === 'storageLimit') {
    return { type: 'error', key: 'uploadStorageLimit', params: { limit: info.limit ?? '' }, link }
  }
  return undefined
}

/** 上传任务失败后是否值得重试。 */
export const isRetryableUpload = (error: unknown): boolean => isRetryableApiError(error)
