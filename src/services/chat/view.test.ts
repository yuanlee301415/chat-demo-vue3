import { describe, expect, it } from 'vitest'

import type { ServerToolUseBlock, TextCitation, WebSearchToolResultBlock } from '../api/types'
import type { AssistantMessage, ReplyBlock } from './types'
import { buildReplyView, getAreaTitle, getTotalThinkingSeconds } from './view'

const reply = (blocks: ReplyBlock[], status: AssistantMessage['status'] = 'done'): AssistantMessage => ({
  id: 'r1',
  role: 'assistant',
  createdAt: 1,
  model: null,
  prefix: false,
  status,
  blocks,
})

const searchUse = (id: string, queries: string[]): ServerToolUseBlock => ({
  type: 'server_tool_use',
  id,
  name: 'deepseek_web_search',
  input: { action: 'search', queries },
  caller: { type: 'direct' },
  kind: 'search',
})

const searchResult = (toolUseId: string, url: string): WebSearchToolResultBlock => ({
  type: 'web_search_tool_result',
  tool_use_id: toolUseId,
  kind: 'search',
  content: [
    {
      type: 'web_search_result',
      title: '站点',
      url,
      snippet: '摘要',
      site_icon: null,
      site_name: '示例站',
      encrypted_content: '',
      page_age: null,
    },
  ],
})

const citation = (url: string, title: string): TextCitation => ({
  type: 'web_search_result_location',
  url,
  title,
  cited_text: '',
  encrypted_index: '',
})

describe('buildReplyView', () => {
  it('思考块进时间线，引用编号插在正文块尾', () => {
    const blocks: ReplyBlock[] = [
      { type: 'thinking', thinking: '思考', startedAt: 1000, endedAt: 3000 },
      { type: 'text', text: '答案', citations: [citation('https://a.com/x', 'A')] },
    ]

    const view = buildReplyView(reply(blocks), false)

    expect(view.steps.map((step) => step.type)).toEqual(['thinking'])
    expect(view.answer?.markdown).toBe('答案[citation:1]')
    expect(view.sources).toHaveLength(1)
    expect(view.sources[0]).toMatchObject({
      url: 'https://a.com/x',
      title: 'A',
      siteName: 'a.com',
      index: 1,
    })
    expect(getTotalThinkingSeconds(view.steps, 0)).toBe(2)
  })

  it('搜索调用聚合成步骤，结果进 searchResults 并编号', () => {
    const blocks: ReplyBlock[] = [searchUse('t1', ['q1']), searchResult('t1', 'https://b.com/p'), { type: 'text', text: '总结' }]

    const view = buildReplyView(reply(blocks), false)

    expect(view.steps[0]).toMatchObject({ type: 'search', kind: 'search', queries: ['q1'], status: 'done' })
    expect(view.searchResults).toHaveLength(1)
    expect(view.searchResults[0]?.index).toBe(1)
    expect(view.searchResults[0]?.siteName).toBe('示例站')
    expect(view.answer?.markdown).toBe('总结')
  })

  it('结果未到时按是否流式区分 wip / failed', () => {
    const blocks: ReplyBlock[] = [searchUse('t1', ['q'])]

    expect(buildReplyView(reply(blocks), false).steps[0]).toMatchObject({ status: 'failed' })
    expect(buildReplyView(reply(blocks, 'streaming'), true).steps[0]).toMatchObject({ status: 'wip' })
  })

  it('模板文本不进入正文', () => {
    const blocks: ReplyBlock[] = [
      { type: 'text', text: '模板', isTemplate: true },
      { type: 'text', text: '正文' },
    ]

    expect(buildReplyView(reply(blocks), false).answer?.markdown).toBe('正文')
  })
})

describe('getAreaTitle', () => {
  it('有正文时展示思考用时', () => {
    const view = buildReplyView(
      reply([
        { type: 'thinking', thinking: '思考', startedAt: 1000, endedAt: 4000 },
        { type: 'text', text: '答案' },
      ]),
      false,
    )

    expect(getAreaTitle(view, false, 0)).toBe('已思考（用时 3 秒）')
  })

  it('没有正文且已结束时展示停止', () => {
    const view = buildReplyView(reply([{ type: 'thinking', thinking: '思考' }]), false)

    expect(getAreaTitle(view, false, 0)).toBe('已停止')
  })

  it('流式中展示正在思考或正在搜索', () => {
    const thinkingView = buildReplyView(reply([{ type: 'thinking', thinking: '思考' }], 'streaming'), true)
    expect(getAreaTitle(thinkingView, true, 0)).toBe('正在思考')

    const searchView = buildReplyView(reply([searchUse('t1', ['q'])], 'streaming'), true)
    expect(getAreaTitle(searchView, true, 0)).toBe('正在搜索')
  })
})
