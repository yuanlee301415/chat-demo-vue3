/**
 * Prism 的语言包是副作用脚本，`@types/prismjs` 不覆盖 `components/*` 子路径；
 * 这里只声明「可动态 import」，模块本身没有可用的导出。
 */
declare module 'prismjs/components/*' {
  const content: unknown
  export default content
}
