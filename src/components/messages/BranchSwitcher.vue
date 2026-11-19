<script setup lang="ts">
import { NButton, NButtonGroup } from 'naive-ui'

import type { MessageVersions } from '../../services/chat/branches'

const props = defineProps<{
  /** 同一父节点下的版本信息；单版本时由父组件传 undefined */
  versions?: MessageVersions
}>()

const emit = defineEmits<{
  /** 切到指定版本的消息 id */
  select: [id: string]
}>()

/** 切到上一个版本；已是第一个则不动。 */
const previous = () => {
  if (props.versions === undefined) {
    return
  }
  const index = props.versions.index
  if (index > 0) {
    emit('select', props.versions.ids[index - 1])
  }
}

/** 切到下一个版本；已是最后一个则不动。 */
const next = () => {
  if (props.versions === undefined) {
    return
  }
  const index = props.versions.index
  if (index < props.versions.ids.length - 1) {
    emit('select', props.versions.ids[index + 1])
  }
}
</script>

<template>
  <NButtonGroup v-if="versions !== undefined" size="tiny" class="branch">
    <NButton quaternary :disabled="versions.index === 0" aria-label="上一个版本" @click="previous">‹</NButton>
    <span class="branch__count">{{ versions.index + 1 }}/{{ versions.ids.length }}</span>
    <NButton quaternary :disabled="versions.index === versions.ids.length - 1" aria-label="下一个版本" @click="next">›</NButton>
  </NButtonGroup>
</template>

<style scoped>
.branch {
  display: inline-flex;
  align-items: center;
  margin-top: 4px;
}

.branch__count {
  padding: 0 6px;
  color: #8a8f99;
  font-size: 12px;
}
</style>
