<script setup lang="ts">
import type { Link as LinkNode } from 'mdast'
import { computed } from 'vue'

import { sanitizeUrl } from '../../services/markdown/url'

const props = defineProps<{
  /** mdast 链接节点，url 保留原文 */
  node: LinkNode
}>()

/** 页内锚点与邮件地址只显示链接文字，不生成可点击链接。 */
const plain = computed(() => props.node.url.startsWith('#') || props.node.url.startsWith('mailto:'))

/** 渲染用的 href；非法地址为 undefined，文字仍然显示。 */
const href = computed(() => sanitizeUrl(props.node.url))
</script>

<template>
  <template v-if="plain"><slot /></template>
  <a v-else :href="href" :title="node.title || undefined" target="_blank" rel="noreferrer"><slot /></a>
</template>
