<script setup lang="ts">
import { NButton, useMessage } from 'naive-ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { useI18n } from '../../i18n'
import { canContinueReply, getReplyText } from '../../services/chat/reply'
import type { AssistantMessage } from '../../services/chat/types'
import { buildReplyView, getAreaTitle, type Step } from '../../services/chat/view'
import { useStreamStore } from '../../stores/stream'

const props = defineProps<{
  /** 所属会话 id */
  sessionId: string
  /** 助手回复 */
  message: AssistantMessage
  /** 是否仍在流式生成 */
  streaming: boolean
}>()

const { t } = useI18n()
const stream = useStreamStore()
const toast = useMessage()

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

/** 是否允许继续生成；与 store 的判定同源。 */
const canContinue = computed(() => canContinueReply(props.message))

/** 复制正文；非安全上下文可能失败，失败给提示。 */
const copy = async () => {
  try {
    await navigator.clipboard.writeText(getReplyText(props.message))
    toast.success(t('copy'))
  } catch {
    toast.error(t('copyFailed'))
  }
}

/** 重新生成当前回答。 */
const regenerate = () => {
  if (!props.streaming) {
    stream.regenerate(props.sessionId, props.message.id)
  }
}

/** 继续未完成的回答。 */
const continueReply = () => {
  if (!props.streaming) {
    stream.continueReply(props.sessionId, props.message.id)
  }
}

/** 失败后重试：按重新生成处理，产生新的回答版本。 */
const retry = () => {
  if (!props.streaming) {
    stream.regenerate(props.sessionId, props.message.id)
  }
}
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

    <div class="actions">
      <NButton v-if="message.error" text size="tiny" :disabled="streaming" @click="retry">{{ t('retry') }}</NButton>
      <NButton text size="tiny" @click="copy">{{ t('copy') }}</NButton>
      <NButton text size="tiny" :disabled="streaming" @click="regenerate">{{ t('regenerate') }}</NButton>
      <NButton v-if="canContinue" text size="tiny" :disabled="streaming" @click="continueReply">{{ t('continueGenerating') }}</NButton>
    </div>
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

.actions {
  display: flex;
  gap: 12px;
  opacity: 0.7;
}

.actions:hover {
  opacity: 1;
}
</style>
