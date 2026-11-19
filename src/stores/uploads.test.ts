import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../services/api/ApiError'
import { useUploadsStore } from './uploads'

const uploadFile = vi.fn()

vi.mock('../services/api/client', () => ({
  uploadFile: (...args: unknown[]) => uploadFile(...args),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  uploadFile.mockReset()
})

describe('uploads store', () => {
  it('上传成功写入 serverId', async () => {
    uploadFile.mockResolvedValueOnce({ id: 'file-1' })
    const uploads = useUploadsStore()

    await expect(uploads.upload('sk', 'a', new Blob(['x']), 'a.txt', false)).resolves.toBe('file-1')

    expect(uploads.taskOf('a')).toEqual({ status: 'done', serverId: 'file-1' })
    await expect(uploads.waitFor('a')).resolves.toBe('file-1')
  })

  it('失败记为 error 并抛出原错误', async () => {
    uploadFile.mockRejectedValueOnce(new ApiError('http', 'bad format', 400))
    const uploads = useUploadsStore()

    await expect(uploads.upload('sk', 'b', new Blob(['x']), 'b.txt', false)).rejects.toMatchObject({ status: 400 })

    expect(uploads.taskOf('b')).toMatchObject({ status: 'error', retryable: false })
  })

  it('取消后移除任务', async () => {
    uploadFile.mockImplementationOnce(
      (_key: string, _file: File, _purpose: unknown, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        }),
    )
    const uploads = useUploadsStore()

    const promise = uploads.upload('sk', 'c', new Blob(['x']), 'c.txt', false)
    uploads.cancel('c')

    await expect(promise).rejects.toThrow('aborted')
    expect(uploads.taskOf('c')).toBeUndefined()
  })

  it('同一 id 复用在途任务', async () => {
    let resolveUpload: (value: { id: string }) => void = () => {}
    uploadFile.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve
      }),
    )
    const uploads = useUploadsStore()

    const first = uploads.upload('sk', 'd', new Blob(['x']), 'd.txt', false)
    const second = uploads.upload('sk', 'd', new Blob(['x']), 'd.txt', false)
    resolveUpload({ id: 'file-2' })

    await expect(Promise.all([first, second])).resolves.toEqual(['file-2', 'file-2'])
    expect(uploadFile).toHaveBeenCalledTimes(1)
  })
})
