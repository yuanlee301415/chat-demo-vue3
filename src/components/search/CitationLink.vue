<script setup lang="ts">
import type { Source } from '../../services/chat/view'

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
  <span class="ds-markdown-cite" role="link" tabindex="0" @click="open" @keydown.enter="open" @keydown.space.prevent="open">{{ source.index }}</span>
</template>
