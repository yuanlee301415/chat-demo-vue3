import type { BlockContent, DefinitionContent, List as ListNode, PhrasingContent, Root, Table as TableNode } from 'mdast'
import { Fragment, defineComponent, h, type PropType, type VNode } from 'vue'

import { sanitizeUrl } from '../../services/markdown/url'
import CitationLink from '../search/CitationLink.vue'
import CodeBlock from './CodeBlock.vue'
import MarkdownLink from './MarkdownLink.vue'
import MathFormula from './MathFormula.vue'

/** 把纯文本按行拆开，源文每个换行（含软换行）都渲染为视觉换行。 */
const renderText = (value: string): VNode[] => {
  const result: VNode[] = []
  value.split(/\r?\n/).forEach((line, index) => {
    result.push(h('span', { key: `${index}s` }, line), h('br', { key: `${index}br` }))
  })
  result.pop()
  return result
}

/** 单个行内节点 → VNode；未单独处理的节点在解析阶段已换成文本。 */
const renderPhrasingNode = (node: PhrasingContent): VNode | null => {
  switch (node.type) {
    case 'inlineMath':
      return h(MathFormula, { value: node.value, inline: true })
    case 'break':
      return h('br')
    case 'emphasis':
      return h('em', renderPhrasing(node.children))
    case 'image': {
      // 图片不内联加载，显示为指向图片地址的链接。
      const url = sanitizeUrl(node.url)
      return h('a', { href: url, title: node.title ?? '', target: '_blank', rel: 'noreferrer' }, url)
    }
    case 'html':
      // 只允许换行标签生效，其余 HTML 原文按文本显示。
      return /^<br\s*\/?>$/i.test(node.value) ? h('br') : h('span', { class: 'ds-markdown-html' }, node.value)
    case 'inlineCode':
      return h('code', node.value)
    case 'link':
      return h(MarkdownLink, { node }, () => renderPhrasing(node.children))
    case 'strong':
      return h('strong', renderPhrasing(node.children))
    case 'text':
      return h(Fragment, null, renderText(node.value))
    case 'citation':
      return h(CitationLink, { source: node.source })
    default:
      return null
  }
}

/** 行内内容列表 → VNode 数组。 */
const renderPhrasing = (nodes: PhrasingContent[]): Array<VNode | null> => nodes.map(renderPhrasingNode)

/** 表格：首行作表头，其余行按列数补齐空格。 */
const renderTable = (node: TableNode): VNode => {
  const head = node.children[0]
  const columnCount = head?.children.length ?? 0
  const body = node.children.slice(1)
  return h('div', { class: 'markdown-table-wrapper' }, [
    h('table', [
      head
        ? h('thead', [
            h(
              'tr',
              head.children.map((cell) => h('th', renderPhrasing(cell.children))),
            ),
          ])
        : null,
      body.length > 0
        ? h(
            'tbody',
            body.map((row) => h('tr', [...row.children.map((cell) => h('td', renderPhrasing(cell.children))), ...Array.from({ length: Math.max(0, columnCount - row.children.length) }, () => h('td'))])),
          )
        : null,
    ]),
  ])
}

/** 列表：任务项在文字前加方框，其余保持原生序标。 */
const renderList = (node: ListNode, loading: boolean): VNode => {
  const tag = node.ordered ? 'ol' : 'ul'
  return h(
    tag,
    { start: node.ordered ? (node.start ?? undefined) : undefined },
    node.children.map((child) => {
      const checked = child.checked
      const isTaskItem = typeof checked === 'boolean'
      return h('li', { class: isTaskItem ? 'ds-markdown-task-list-item' : undefined }, [
        // □ U+25A1 / ☑ U+2611
        isTaskItem ? h('span', { class: 'ds-markdown-task-checkbox' }, checked ? '☑  ' : '□  ') : null,
        ...renderBlocks(child.children, loading),
      ])
    }),
  )
}

/** 单个块级节点 → VNode。 */
const renderBlock = (node: BlockContent | DefinitionContent, loading: boolean): VNode | null => {
  switch (node.type) {
    case 'math':
      return h(MathFormula, { value: node.value })
    case 'thematicBreak':
      return h('hr')
    case 'blockquote':
      return h('blockquote', renderBlocks(node.children, loading))
    case 'html':
      return /^<br\s*\/?>$/i.test(node.value) ? h('br') : h('span', { class: 'ds-markdown-html' }, node.value)
    case 'heading':
      return node.children.length === 0 ? null : h(`h${node.depth}`, renderPhrasing(node.children))
    case 'paragraph':
      return h('p', { class: 'ds-markdown-paragraph' }, renderPhrasing(node.children))
    case 'code':
      return h(CodeBlock, { code: node.value, infostring: node.lang || 'text', loading })
    case 'table':
      return renderTable(node)
    case 'list':
      return renderList(node, loading)
    default:
      return null
  }
}

/** 块级内容列表 → VNode 数组。 */
const renderBlocks = (nodes: Array<BlockContent | DefinitionContent>, loading: boolean): Array<VNode | null> => nodes.map((node) => renderBlock(node, loading))

/** Markdown AST 渲染器：递归把 mdast 树换成 Vue VNode。 */
export default defineComponent({
  name: 'MarkdownAstRenderer',
  props: {
    /** 解析后的 mdast 根节点 */
    ast: { type: Object as PropType<Root>, required: true },
    /** 回复仍在流式生成，透传给代码块与 Mermaid */
    loading: { type: Boolean, default: false },
  },
  setup(props) {
    return () => h('div', { class: 'ds-markdown' }, renderBlocks(props.ast.children as Array<BlockContent | DefinitionContent>, props.loading))
  },
})
