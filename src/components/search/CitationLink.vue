<script setup lang="ts">
import { NPopover } from 'naive-ui'

import type { Source } from '../../services/chat/view'
import SourceCard from './SourceCard.vue'

const props = defineProps<{
  /** 引用角标对应的来源 */
  source: Source
}>()

/** 新标签打开来源；角标常嵌在链接文字里，避免触发外层跳转。 */
const open = (event: Event) => {
  event.preventDefault()
  event.stopPropagation()
  window.open(props.source.url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <NPopover trigger="hover" placement="bottom" :delay="300" :show-arrow="false" :content-style="{ maxWidth: '355px', padding: '16px' }">
    <template #trigger>
      <span class="ds-markdown-cite" role="link" tabindex="0" @click="open" @keydown.enter="open" @keydown.space.prevent="open">{{ source.index }}</span>
    </template>
    <SourceCard :source="source" />
  </NPopover>
</template>
