import type { Nodes, Root } from 'mdast'
import { describe, expect, it } from 'vitest'

import type { Source } from '../chat/view'
import { toMdAst } from './parse'

/** 造一个来源，索引即引用角标号。 */
const source = (index: number, url: string): Source => ({ url, title: url, siteName: '', publishedAt: null, snippet: null, siteIcon: null, index })

/** 深度收集 AST 里的节点类型。 */
const collect = (node: Nodes | Root, result: string[] = []): string[] => {
  result.push(node.type)
  if ('children' in node) {
    for (const child of node.children) {
      collect(child as Nodes, result)
    }
  }
  return result
}

describe('toMdAst', () => {
  it('解析标题、表格、任务列表与代码块', () => {
    const ast = toMdAst('# 标题\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] 完成\n- [ ] 待办\n\n```ts\nconst a = 1\n```', {
      sources: undefined,
      disableLink: false,
    })
    const types = collect(ast)
    expect(types).toContain('heading')
    expect(types).toContain('table')
    expect(types).toContain('listItem')
    expect(types).toContain('code')
    expect(JSON.stringify(ast)).toContain('"lang":"ts"')
  })

  it('把存在的 [citation:N] 换成来源节点，缺失的引用直接删掉', () => {
    const ast = toMdAst('前文[citation:1]后文[citation:9]', { sources: [source(1, 'https://example.com/a')], disableLink: false })
    const types = collect(ast)
    expect(types.filter((type) => type === 'citation')).toHaveLength(1)
    expect(JSON.stringify(ast)).toContain('https://example.com/a')
    expect(JSON.stringify(ast)).not.toContain('citation:9')
  })

  it('没有来源列表时保留 [citation:N] 原文', () => {
    const ast = toMdAst('前文[citation:1]', { sources: undefined, disableLink: false })
    expect(collect(ast)).not.toContain('citation')
    expect(JSON.stringify(ast)).toContain('[citation:1]')
  })

  it('disableLink 时链接只保留文字', () => {
    const ast = toMdAst('[示例](https://example.com)', { sources: undefined, disableLink: true })
    const types = collect(ast)
    expect(types).not.toContain('link')
    expect(JSON.stringify(ast)).toContain('示例')
  })

  it('删除线保留定界符文本，不再生成 delete 节点', () => {
    const ast = toMdAst('~~删除~~', { sources: undefined, disableLink: false })
    const types = collect(ast)
    expect(types).not.toContain('delete')
    expect(JSON.stringify(ast)).toContain('~~')
  })

  it('解析行内与块级公式', () => {
    const ast = toMdAst('行内 $x^2$ 与块级：\n\n$$\na + b\n$$', { sources: undefined, disableLink: false })
    const types = collect(ast)
    expect(types).toContain('inlineMath')
    expect(types).toContain('math')
  })
})
