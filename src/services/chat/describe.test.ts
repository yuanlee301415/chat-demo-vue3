import { describe, expect, it } from 'vitest'

import { t } from '../../i18n'
import type { ApiErrorKind } from '../api/types'
import type { AssistantMessage } from './types'
import { describeReply } from './describe'

const base: AssistantMessage = {
  id: 'r1',
  role: 'assistant',
  createdAt: 1,
  model: null,
  prefix: false,
  status: 'done',
  blocks: [],
}

const failed = (kind: ApiErrorKind | 'upload', status?: number, message = 'boom'): AssistantMessage => ({
  ...base,
  status: 'error',
  error: { kind, message, status },
})

describe('describeReply', () => {
  it('按状态码给出文案与操作入口', () => {
    expect(describeReply(failed('http', 401))).toEqual({ text: t('replyInvalidApiKey'), action: 'apiKey' })
    expect(describeReply(failed('http', 402))).toEqual({ text: t('replyInsufficientBalance'), action: 'topUp' })
    expect(describeReply(failed('http', 429))).toEqual({ text: t('replyRateLimited') })
    expect(describeReply(failed('http', 503))).toEqual({ text: t('completionServerBusyToast') })
  })

  it('网络错误统一文案', () => {
    expect(describeReply(failed('network'))).toEqual({ text: t('commonNetworkErrorToast') })
  })

  it('补传失败的原文优先，缺省时用上传失败文案', () => {
    expect(describeReply(failed('upload', undefined, '上传失败：格式不支持'))).toEqual({
      text: '上传失败：格式不支持',
    })
    expect(describeReply(failed('upload', undefined, ''))).toEqual({ text: t('uploadFileStatusFailed') })
  })

  it('识别不了的 localMessage 回退到保存时的原文', () => {
    expect(
      describeReply({
        ...base,
        status: 'error',
        error: { kind: 'http', status: 400, message: '原文', localMessage: { key: 'notAKey' as never } },
      }),
    ).toEqual({ text: '原文' })
  })

  it('拒绝回复用模板或默认拒绝文案，并按正文样式展示', () => {
    expect(
      describeReply({
        ...base,
        stopReason: 'refusal',
        blocks: [{ type: 'text', text: '无法回答', isTemplate: true }],
      }),
    ).toEqual({ text: '无法回答', presentation: 'response' })

    expect(describeReply({ ...base, stopReason: 'refusal' })).toEqual({
      text: t('replyRefused'),
      presentation: 'response',
    })
  })

  it('模板答复按正文样式展示，正常回复不提示', () => {
    expect(describeReply({ ...base, blocks: [{ type: 'text', text: '模板', isTemplate: true }] })).toEqual({ text: '模板', presentation: 'response' })

    expect(describeReply({ ...base, blocks: [{ type: 'text', text: '正常' }] })).toBeNull()
  })
})
