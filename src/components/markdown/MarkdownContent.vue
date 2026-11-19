<script setup lang="ts">
import { computed } from 'vue'

import type { Source } from '../../services/chat/view'
import { toMdAst } from '../../services/markdown/parse'
import MarkdownAstRenderer from './MarkdownAstRenderer'
import { useThrottleMarkdownRender } from './useThrottleMarkdownRender'
import './markdown.css'
import './highlight.css'

const props = defineProps<{
  /** Markdown 原文；流式时按渲染耗时节流 */
  content: string
  /** 是否仍在流式生成 */
  loading: boolean
  /** 思考内容等不渲染链接的场景 */
  disableLink?: boolean
  /** 正文引用可指向的来源；缺省时不解析 [citation:N] */
  sources?: Source[]
}>()

const throttled = useThrottleMarkdownRender(
  () => props.content,
  () => props.loading,
)

/** 解析后的 AST；空内容不渲染任何节点。 */
const ast = computed(() => {
  const input = throttled.value
  return input ? toMdAst(input, { sources: props.sources, disableLink: props.disableLink ?? false }) : null
})
</script>

<template>
  <MarkdownAstRenderer v-if="ast !== null" :ast="ast" :loading="loading" />
</template>
