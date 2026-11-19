/**
 * 图标清单：与 `src/assets/icons/*.svg` 一一对应。
 * 新增图标时先放 SVG，再在这里登记名字；漏登记或文件名不匹配会在模块加载时直接报错。
 *
 * @see src/assets/icons 图标的唯一来源（文件系统）
 */
export const ICON_NAMES = [
  'arrow-up-right',
  'browse',
  'browse-warning',
  'check',
  'checked',
  'chevron-down',
  'chevron-right',
  'close',
  'close-fill',
  'copy',
  'dark',
  'data',
  'edit',
  'ellipsis',
  'follow-system',
  'light',
  'link',
  'new-chat',
  'panel-left',
  'paperclip',
  'search',
  'search-warning',
  'send',
  'settings',
  'stop',
  'think',
] as const

export type IconName = (typeof ICON_NAMES)[number]

const ICON_DIR = '../../assets/icons/'

const modules = import.meta.glob('../../assets/icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

/**
 * 从 glob 路径取图标名（去掉目录与 `.svg` 后缀）。
 *
 * @param filePath `import.meta.glob` 返回的键
 */
const fileToName = (filePath: string) => filePath.slice(ICON_DIR.length, -'.svg'.length)

/** 图标名 → SVG 源码。AppIcon 直接内联渲染，不需要额外的网络请求。 */
export const ICON_SVGS = Object.fromEntries(
  ICON_NAMES.map((name) => {
    const svg = modules[`${ICON_DIR}${name}.svg`]
    if (svg === undefined) {
      throw new Error(`[AppIcon] 缺少图标文件：src/assets/icons/${name}.svg`)
    }
    return [name, svg]
  }),
) as Record<IconName, string>

if (import.meta.env.DEV) {
  const registered = new Set<string>(ICON_NAMES)
  const orphans = Object.keys(modules)
    .map(fileToName)
    .filter((name) => !registered.has(name))
  if (orphans.length > 0) {
    console.warn('[AppIcon] 以下 SVG 未在 ICON_NAMES 登记：', orphans.join(', '))
  }
}
