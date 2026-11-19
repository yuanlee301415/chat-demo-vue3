import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

import type { TranslationMessage } from '../i18n'
import { isImage, resolveMimeType, validateFiles, type UploadTask } from '../services/attachments'
import type { FileAttachment } from '../services/chat/types'
import { createId } from '../utils/id'
import { useUploadsStore } from './uploads'

/** 草稿里的附件：本地文件 + 预览地址，上传任务按 `id` 关联。 */
export type DraftAttachment = {
  /** 本地标识，也是上传任务的 key */
  id: string
  /** 本地文件；发送成功后原件交给会话 */
  file: File
  /** 是否图片，决定请求里的 image/document 块 */
  isImage: boolean
  /** 图片预览地址；非图片为 null */
  previewUrl: string | null
}

/** 一条草稿：正文 + 附件。 */
export type Draft = {
  /** 输入框正文 */
  text: string
  /** 尚未发送的附件 */
  attachments: DraftAttachment[]
}

/** 空草稿；新对话的草稿 key 是 null。 */
export const EMPTY_DRAFT: Draft = { text: '', attachments: [] }

/** 发送前把草稿转成消息附件；有附件未上传成功时返回 null。 */
export const prepareDraftMessage = (draft: Draft, tasks: Record<string, UploadTask>): { text: string; files: (FileAttachment & { blob: Blob })[] } | null => {
  const text = draft.text.trim()
  if (text === '' && draft.attachments.length === 0) {
    return null
  }
  const files: (FileAttachment & { blob: Blob })[] = []
  for (const attachment of draft.attachments) {
    const task = tasks[attachment.id]
    if (task?.status !== 'done') {
      return null
    }
    files.push({
      id: attachment.id,
      serverId: task.serverId,
      name: attachment.file.name,
      size: attachment.file.size,
      isImage: attachment.isImage,
      mimeType: resolveMimeType(attachment.file),
      blob: attachment.file,
    })
  }
  return { text, files }
}

/** 创建预览地址；非图片或环境不支持时返回 null。 */
const createPreview = (file: File, image: boolean): string | null => (image && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null)

/** 释放预览地址；上传任务由调用方决定是否取消。 */
const releaseAttachment = (attachment: DraftAttachment, cancelUpload: boolean) => {
  if (cancelUpload) {
    useUploadsStore().cancel(attachment.id)
  }
  if (attachment.previewUrl !== null) {
    URL.revokeObjectURL(attachment.previewUrl)
  }
}

/**
 * 草稿只存在本次页面内存里，按会话 id 分组（null 是新对话）。
 * 输入框绑定这里的 text，附件上传状态在 uploads store。
 */
export const useDraftsStore = defineStore('drafts', () => {
  const drafts = shallowRef<Map<string | null, Draft>>(new Map())

  /** 取草稿；没有时返回空草稿。 */
  const getDraft = (sessionId: string | null): Draft => drafts.value.get(sessionId) ?? EMPTY_DRAFT

  /** 更新草稿；正文与附件都为空时删除该条，避免残留空对象。 */
  const updateDraft = (sessionId: string | null, update: (draft: Draft) => Draft) => {
    const next = update(drafts.value.get(sessionId) ?? EMPTY_DRAFT)
    const map = new Map(drafts.value)
    if (next.text !== '' || next.attachments.length > 0) {
      map.set(sessionId, next)
    } else {
      map.delete(sessionId)
    }
    drafts.value = map
  }

  /** 更新正文。 */
  const setText = (sessionId: string | null, text: string) => {
    updateDraft(sessionId, (draft) => ({ ...draft, text }))
  }

  /** 整批校验通过后才创建预览并开始上传；失败时整批不添加。 */
  const addFiles = (sessionId: string | null, files: File[], apiKey: string): TranslationMessage | null => {
    if (files.length === 0) {
      return null
    }
    const error = validateFiles(files, getDraft(sessionId).attachments.length)
    if (error !== null) {
      return error
    }
    const added = files.map((file): DraftAttachment => {
      const image = isImage(resolveMimeType(file))
      return { id: createId(), file, isImage: image, previewUrl: createPreview(file, image) }
    })
    updateDraft(sessionId, (draft) => ({ ...draft, attachments: [...draft.attachments, ...added] }))
    const uploads = useUploadsStore()
    for (const attachment of added) {
      // 上传失败由任务记录并展示重试入口，这里不抛。
      void uploads.upload(apiKey, attachment.id, attachment.file, attachment.file.name, attachment.isImage).catch(() => {})
    }
    return null
  }

  /** 重试某个失败附件。 */
  const retryAttachment = (sessionId: string | null, attachmentId: string, apiKey: string) => {
    const attachment = getDraft(sessionId).attachments.find((item) => item.id === attachmentId)
    if (attachment !== undefined) {
      void useUploadsStore()
        .upload(apiKey, attachment.id, attachment.file, attachment.file.name, attachment.isImage)
        .catch(() => {})
    }
  }

  /** 移除附件：取消上传并释放预览。 */
  const removeAttachment = (sessionId: string | null, attachmentId: string) => {
    const attachment = getDraft(sessionId).attachments.find((item) => item.id === attachmentId)
    if (attachment === undefined) {
      return
    }
    releaseAttachment(attachment, true)
    updateDraft(sessionId, (draft) => ({ ...draft, attachments: draft.attachments.filter((item) => item.id !== attachmentId) }))
  }

  /** 发送成功：释放预览但保留上传完成态，清空草稿。 */
  const clearSentDraft = (sessionId: string | null) => {
    for (const attachment of getDraft(sessionId).attachments) {
      releaseAttachment(attachment, false)
    }
    updateDraft(sessionId, () => EMPTY_DRAFT)
  }

  /** 删除会话或放弃编辑：取消上传并释放预览。 */
  const clearDraft = (sessionId: string | null) => {
    for (const attachment of getDraft(sessionId).attachments) {
      releaseAttachment(attachment, true)
    }
    updateDraft(sessionId, () => EMPTY_DRAFT)
  }

  /** 清空全部草稿（删除全部会话时用）。 */
  const clearAll = () => {
    for (const draft of drafts.value.values()) {
      for (const attachment of draft.attachments) {
        releaseAttachment(attachment, true)
      }
    }
    drafts.value = new Map()
  }

  return { drafts, getDraft, setText, addFiles, retryAttachment, removeAttachment, clearSentDraft, clearDraft, clearAll }
})
