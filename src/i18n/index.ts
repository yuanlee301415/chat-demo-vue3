import { zh } from './zh'

export type TranslationKey = keyof typeof zh
export type TranslationParams = Record<string, string | number>
export type TranslationMessage = { key: TranslationKey; params?: TranslationParams }
/** 带文字链接的提示：link 跟在正文后，在新窗口打开；type 为 error 时前面带错误图标。 */
export type LinkedMessage = TranslationMessage & {
  type?: 'error'
  link?: { key: TranslationKey; href: string }
}

export const isTranslationKey = (key: unknown): key is TranslationKey => typeof key === 'string' && Object.hasOwn(zh, key)

/** 只有中文一种语言；`{name}` 占位符按 params 替换，缺参时保留原样，避免渲染出 undefined。 */
export const t = (key: TranslationKey, params?: TranslationParams): string =>
  zh[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params?.[name]
    return typeof value === 'string' || typeof value === 'number' ? String(value) : placeholder
  })

/** 组件统一从这里取 `t`；将来若要加插值作用域或按模块分包，只改这一处。 */
export const useI18n = () => ({ t })
