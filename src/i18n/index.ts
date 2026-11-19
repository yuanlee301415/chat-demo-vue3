import { zh } from './zh'

/**
 * 文案键：由 `zh` 的键推导。
 *
 * @see zh 文案的唯一来源
 */
export type TranslationKey = keyof typeof zh

/** 占位符插值参数：`{name}` 会被同名参数替换。 */
export type TranslationParams = Record<string, string | number>

/** 一条可渲染的提示：文案键 + 可选插值参数。 */
export type TranslationMessage = {
  /** 文案键，唯一来源是 `zh` */
  key: TranslationKey
  /** `{name}` 插值参数 */
  params?: TranslationParams
}

/** 带文字链接的提示：link 跟在正文后，在新窗口打开；type 为 error 时前面带错误图标。 */
export type LinkedMessage = TranslationMessage & {
  /** 设为 error 时按错误样式展示 */
  type?: 'error'
  /** 附在正文后的链接，新窗口打开 */
  link?: { key: TranslationKey; href: string }
}

/**
 * 判断未知输入是否是合法文案键，供历史数据回退使用。
 *
 * @see TranslationKey 合法键的集合
 */
export const isTranslationKey = (key: unknown): key is TranslationKey => typeof key === 'string' && Object.hasOwn(zh, key)

/** 只有中文一种语言；`{name}` 占位符按 params 替换，缺参时保留原样，避免渲染出 undefined。 */
export const t = (key: TranslationKey, params?: TranslationParams): string =>
  zh[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params?.[name]
    return typeof value === 'string' || typeof value === 'number' ? String(value) : placeholder
  })

/** 组件统一从这里取 `t`；将来若要加插值作用域或按模块分包，只改这一处。 */
export const useI18n = () => ({ t })
