import { computed, shallowRef } from 'vue'

import { useI18n } from '../../i18n'
import { ApiError } from '../../services/api/ApiError'
import { verifyApiKey } from '../../services/api/client'
import { classifyApiError } from '../../services/api/errors'
import { useSettingsStore } from '../../stores/settings'

/**
 * 输入 API Key 后先用 GET /models 校验，通过才保存。
 * 输入值、校验状态与错误文案都留在组合式函数里，切换分组不会丢。
 */
export const useApiKeyForm = (onSaved?: () => void) => {
  const { t } = useI18n()
  const settings = useSettingsStore()
  const apiKey = shallowRef('')
  const verifying = shallowRef(false)
  const failure = shallowRef<{ cause: unknown } | null>(null)

  /** 校验失败的文案：401、网络与其他错误分开说明。 */
  const error = computed(() => {
    const cause = failure.value?.cause
    if (cause === undefined) {
      return null
    }
    const condition = classifyApiError(cause)
    if (condition === 'unauthorized') {
      return t('apiKeyInvalid')
    }
    if (condition === 'network') {
      return t('commonNetworkErrorToast')
    }
    const message = cause instanceof ApiError && cause.localMessage !== undefined ? t(cause.localMessage.key, cause.localMessage.params) : cause instanceof Error ? cause.message : String(cause)
    return t('apiKeyVerificationFailed', { message })
  })

  /** 校验并保存；成功后清空输入并通知调用方退出编辑态。 */
  const submit = async () => {
    const value = apiKey.value.trim()
    if (value === '' || verifying.value) {
      return
    }
    verifying.value = true
    failure.value = null
    try {
      await verifyApiKey(value)
      settings.setApiKey(value)
      apiKey.value = ''
      onSaved?.()
    } catch (cause) {
      failure.value = { cause }
    } finally {
      verifying.value = false
    }
  }

  return { apiKey, verifying, error, submit }
}
