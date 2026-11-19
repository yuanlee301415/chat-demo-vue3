import { t, type TranslationMessage } from '../../i18n'
import type { ApiErrorKind } from './types'

/**
 * 接口错误：`kind` 区分失败阶段，`status` 是 HTTP 状态码；
 * 传 `TranslationMessage` 时按当前（固定中文）文案渲染，并保留原文供历史数据回退。
 *
 * @see ApiErrorKind 失败阶段的唯一来源
 * @see errors.ts 按状态码与 `kind` 归类
 */
export class ApiError extends Error {
  readonly localMessage?: TranslationMessage

  constructor(
    readonly kind: ApiErrorKind,
    message: string | TranslationMessage,
    readonly status?: number,
  ) {
    super(typeof message === 'string' ? message : t(message.key, message.params))
    this.name = 'ApiError'
    this.localMessage = typeof message === 'string' ? undefined : message
  }
}
