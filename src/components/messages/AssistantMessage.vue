<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useI18n } from '../../i18n'
import type { AssistantMessage } from '../../services/chat/types'
import { buildReplyView, getAreaTitle, type Step } from '../../services/chat/view'

const props = defineProps<{
  /** 助手回复 */
  message: AssistantMessage
  /** 是否仍在流式生成 */
  streaming: boolean
}>()

const { t } = useI18n()

/** 当前时间，流式时每秒刷新用于思考用时。 */
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

/** 开始每秒刷新。 */
const startTimer = () => {
  if (timer === undefined) {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }
}

/** 停止刷新。 */
const stopTimer = () => {
  if (timer !== undefined) {
    clearInterval(timer)
    timer = undefined
  }
}

watch(
  () => props.streaming,
  (streaming) => {
    if (streaming) {
      startTimer()
    } else {
      stopTimer()
      now.value = Date.now()
    }
  },
  { immediate: true },
)

onBeforeUnmount(stopTimer)

/** 由回复推导时间线与正文。 */
const view = computed(() => buildReplyView(props.message, props.streaming))

/** 是否已经有正文；没有时标题算「进行中」。 */
const hasResponse = computed(() => view.value.answer !== null)

/** 思考区标题；没开启思考且没有步骤时为 null。 */
const title = computed(() => {
  const thinking = props.message.thinking ?? view.value.steps.some((step) => step.type === 'thinking')
  return thinking ? getAreaTitle(view.value, props.streaming, now.value, hasResponse.value) : null
})

/** 思考块的纯文本内容。 */
const thinkingText = (step: Extract<Step, { type: 'thinking' }>) => step.blocks.map((block) => block.thinking).join('')

/** 工具步骤的一行摘要；文案复用已有 key。 */
const toolText = (step: Step): string | null => {
  switch (step.type) {
    case 'search':
      return `${t('toolSearchIntro')} ${step.queries.join('、')}${step.results.length > 0 ? ` · ${t('messageSearchSummaries', { count: step.results.length })}` : ''}`
    case 'open':
      return t('messageSearchResults', { count: step.pages.length })
    case 'read_link':
      return t('messageSearchResults', { count: step.links.length })
    case 'find':
      return `${t('searchResult')}：${step.patterns.map((pattern) => pattern.pattern).join('、')}`
    default:
      return null
  }
}

/** 错误文案：优先本地化文案，回退服务端原文。 */
const errorText = computed(() => {
  const error = props.message.error
  if (error === undefined) {
    return null
  }
  return error.localMessage === undefined ? error.message : t(error.localMessage.key, error.localMessage.params)
})
</script>

<template>
  <div class="message message--assistant">
    <div v-if="title" class="thinking-title">{{ title }}</div>

    <template v-for="(step, index) in view.steps" :key="index">
      <pre v-if="step.type === 'thinking'" class="thinking">{{ thinkingText(step) }}</pre>
      <p v-else-if="step.type === 'text'" class="preamble">{{ step.markdown }}</p>
      <p v-else-if="toolText(step)" class="tool">{{ toolText(step) }}</p>
    </template>

    <p v-if="view.answer" class="answer">{{ view.answer.text }}</p>
    <p v-else-if="message.status === 'stopped'" class="muted">{{ t('messageThinkStopped') }}</p>

    <p v-if="errorText" class="error">{{ errorText }}</p>
  </div>
</template>

<style scoped>
.message--assistant {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 80%;
}

.thinking-title {
  color: #6b7280;
  font-size: 13px;
}

.thinking {
  margin: 0;
  padding: 8px 12px;
  overflow-x: auto;
  color: #6b7280;
  font-size: 12px;
  white-space: pre-wrap;
  background: rgb(128 128 128 / 8%);
  border-radius: 8px;
}

.preamble,
.answer {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.tool {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.muted {
  margin: 0;
  color: #8a8f99;
  font-size: 13px;
}

.error {
  margin: 0;
  color: #d64545;
  font-size: 13px;
}
</style>
