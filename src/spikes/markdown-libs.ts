/**
 * P0-04 spike：只验证「重型依赖能按需加载」。
 * Phase 4 会用 `src/services/markdown/*` 正式实现（含安全配置、语言依赖拓扑、渲染队列），届时删除本文件。
 */

type Mermaid = typeof import('mermaid').default

let mermaidPromise: Promise<Mermaid> | null = null

export const loadMermaid = (): Promise<Mermaid> => {
  mermaidPromise ??= import('mermaid')
    .then((module) => module.default)
    .catch((error: unknown) => {
      mermaidPromise = null
      throw error
    })
  return mermaidPromise
}

let mermaidRenderId = 0

export const renderMermaidSvg = async (code: string): Promise<string> => {
  const mermaid = await loadMermaid()
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
  })
  const { svg } = await mermaid.render(`spike-mermaid-${(mermaidRenderId += 1)}`, code)
  return svg
}

type Katex = typeof import('katex').default

let katexPromise: Promise<Katex> | null = null

export const loadKatex = (): Promise<Katex> => {
  katexPromise ??= Promise.all([import('katex'), import('katex/contrib/mhchem'), import('katex/dist/katex.min.css')]).then(([module]) => module.default)
  return katexPromise
}

export const renderMathHtml = async (tex: string): Promise<string> => {
  const katex = await loadKatex()
  return katex.renderToString(tex, { displayMode: true, throwOnError: false, trust: false })
}

const languageLoaders: Record<string, () => Promise<unknown>> = {
  bash: () => import('prismjs/components/prism-bash.min.js'),
  json: () => import('prismjs/components/prism-json.min.js'),
  typescript: () => import('prismjs/components/prism-typescript.min.js'),
}

type PrismApi = typeof import('prismjs')

let prismPromise: Promise<PrismApi> | null = null

/**
 * Prism 核心也是按需加载：它是 CJS，`import('prismjs')` 的默认导出需要兼容取值。
 * 语言包是副作用脚本，直接挂到全局 `window.Prism` 上，因此核心必须先执行完。
 */
const loadPrism = (): Promise<PrismApi> => {
  prismPromise ??= import('prismjs').then((module) => {
    const candidate = module as unknown as { default?: PrismApi }
    return candidate.default ?? (module as unknown as PrismApi)
  })
  return prismPromise
}

export const highlightCode = async (code: string, language: string): Promise<string> => {
  const prism = await loadPrism()
  const load = languageLoaders[language]
  if (load !== undefined) {
    await load()
  }
  const grammar = prism.languages[language]
  if (grammar === undefined) {
    return prism.util.encode(code) as string
  }
  return prism.highlight(code, grammar, language)
}
