import { defineStore } from 'pinia'
import { markRaw, shallowRef } from 'vue'

import type { LinkedMessage } from '../i18n'
import { uploadFile } from '../services/api/client'
import { describeUploadError, describeUploadQuota, getUploadPurpose, isRetryableUpload, type UploadTask } from '../services/attachments'

/** 同时上传的文件数。 */
const MAX_CONCURRENT = 3

/**
 * 附件上传：按附件本地 id 登记任务，同一 id 复用在途请求。
 * 队列最多三个并发；排队期间取消的任务不会发出请求。
 */
export const useUploadsStore = defineStore('uploads', () => {
  /** 上传任务，key 是附件本地 id */
  const tasks = shallowRef<Record<string, UploadTask>>({})
  /** 配额类失败需要额外提示（界面转 toast） */
  const notices = shallowRef<LinkedMessage[]>([])
  const pending = markRaw(new Map<string, Promise<string>>())
  const controllers = markRaw(new Map<string, AbortController>())
  const queue = markRaw<Array<() => void>>([])
  let running = 0

  /** 写入/删除任务。 */
  const setTask = (id: string, task: UploadTask | null) => {
    if (task === null) {
      const next = { ...tasks.value }
      delete next[id]
      tasks.value = next
    } else {
      tasks.value = { ...tasks.value, [id]: task }
    }
  }

  /** 队列空位允许时启动下一个任务。 */
  const runNext = () => {
    while (running < MAX_CONCURRENT) {
      const job = queue.shift()
      if (job === undefined) {
        return
      }
      running++
      job()
    }
  }

  /** 在队列里执行一次上传，返回服务端 file_id；失败时任务记为 error 并抛出原错误。 */
  const upload = (apiKey: string, id: string, blob: Blob, name: string, isImage: boolean): Promise<string> => {
    const current = pending.get(id)
    if (current !== undefined) {
      return current
    }
    const controller = new AbortController()
    controllers.set(id, controller)
    setTask(id, { status: 'uploading' })

    const promise = new Promise<string>((resolve, reject) => {
      queue.push(() => {
        if (controller.signal.aborted) {
          running--
          reject(controller.signal.reason)
          runNext()
          return
        }
        const file = blob instanceof File ? blob : new File([blob], name, { type: blob.type })
        uploadFile(apiKey, file, getUploadPurpose(name, isImage), controller.signal)
          .then((result) => {
            setTask(id, { status: 'done', serverId: result.id })
            resolve(result.id)
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) {
              setTask(id, null)
            } else {
              setTask(id, { status: 'error', error: describeUploadError(error), retryable: isRetryableUpload(error) })
              const notice = describeUploadQuota(error)
              if (notice !== undefined) {
                notices.value = [...notices.value, notice]
              }
            }
            reject(error)
          })
          .finally(() => {
            running--
            runNext()
          })
      })
      runNext()
    }).finally(() => {
      pending.delete(id)
      controllers.delete(id)
    })

    pending.set(id, promise)
    return promise
  }

  /** 取消上传并移除任务。 */
  const cancel = (id: string) => {
    controllers.get(id)?.abort()
    setTask(id, null)
  }

  /** 取任务状态；没有任务返回 undefined。 */
  const taskOf = (id: string): UploadTask | undefined => tasks.value[id]

  /** 等某个附件的在途上传结束（成功返回 serverId，失败抛出）。 */
  const waitFor = (id: string): Promise<string | undefined> => pending.get(id) ?? Promise.resolve(tasks.value[id]?.status === 'done' ? tasks.value[id].serverId : undefined)

  /** 取走待展示的配额提示。 */
  const takeNotices = (): LinkedMessage[] => {
    const current = notices.value
    notices.value = []
    return current
  }

  return { tasks, notices, upload, cancel, taskOf, waitFor, takeNotices }
})
