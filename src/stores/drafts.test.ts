import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { prepareDraftMessage, useDraftsStore } from './drafts'
import { useUploadsStore } from './uploads'

const uploadFile = vi.fn()

vi.mock('../services/api/client', () => ({
  uploadFile: (...args: unknown[]) => uploadFile(...args),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  uploadFile.mockReset()
})

describe('drafts store', () => {
  it('添加附件后开始上传，上传完成才能发送', async () => {
    uploadFile.mockResolvedValueOnce({ id: 'file-9' })
    const drafts = useDraftsStore()
    const uploads = useUploadsStore()

    expect(drafts.addFiles(null, [new File(['x'], 'a.txt', { type: 'text/plain' })], 'sk')).toBeNull()
    const [attachment] = drafts.getDraft(null).attachments
    expect(prepareDraftMessage(drafts.getDraft(null), uploads.tasks)).toBeNull()

    await uploads.waitFor(attachment.id)

    expect(prepareDraftMessage(drafts.getDraft(null), uploads.tasks)).toMatchObject({
      text: '',
      files: [{ id: attachment.id, serverId: 'file-9', name: 'a.txt', isImage: false }],
    })
  })

  it('扩展名不合法时整批不添加', () => {
    const drafts = useDraftsStore()

    expect(drafts.addFiles(null, [new File(['x'], 'a.exe')], 'sk')).toEqual({ key: 'uploadUnsupportedFormat' })
    expect(drafts.getDraft(null).attachments).toHaveLength(0)
  })

  it('移除附件会取消上传并释放预览', () => {
    uploadFile.mockImplementation(
      (_key: string, _file: File, _purpose: unknown, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        }),
    )
    const drafts = useDraftsStore()
    const uploads = useUploadsStore()

    drafts.addFiles(null, [new File(['x'], 'a.png', { type: 'image/png' })], 'sk')
    const [attachment] = drafts.getDraft(null).attachments
    drafts.removeAttachment(null, attachment.id)

    expect(drafts.getDraft(null).attachments).toHaveLength(0)
    expect(uploads.taskOf(attachment.id)).toBeUndefined()
  })

  it('发送成功后清空草稿', async () => {
    uploadFile.mockResolvedValueOnce({ id: 'file-9' })
    const drafts = useDraftsStore()
    const uploads = useUploadsStore()

    drafts.setText(null, '带附件')
    drafts.addFiles(null, [new File(['x'], 'a.txt', { type: 'text/plain' })], 'sk')
    await uploads.waitFor(drafts.getDraft(null).attachments[0].id)
    drafts.clearSentDraft(null)

    expect(drafts.getDraft(null)).toEqual({ text: '', attachments: [] })
  })
})
