<script setup lang="ts">
import { NButton, useMessage } from 'naive-ui'
import { computed } from 'vue'

import { useI18n } from '../../i18n'
import { describeReply } from '../../services/chat/describe'
import { canContinueReply } from '../../services/chat/reply'
import type { AssistantMessage } from '../../services/chat/types'
import { useStreamStore } from '../../stores/stream'
import MarkdownContent from '../markdown/MarkdownContent.vue'
import ReplyArea from './ReplyArea.vue'
import { useReplyView } from './useReplyView'

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

/** 由回复推导时间线、正文与来源；来源不变时复用数组，避免流式重解析引用。 */
const view = useReplyView(
  () => props.message,
  () => props.streaming,
)

/** 结束后的提示：模板答复按正文展示，其余为错误/拒绝文案。 */
const notice = computed(() => (props.streaming ? null : describeReply(props.message)))

/** 安全拒绝：下发的思考与正文按协议丢弃，只显示模板答复。 */
const refused = computed(() => props.message.stopReason === 'refusal')

/** 正文；模板答复由 notice 统一展示。 */
const answer = computed(() => (refused.value ? null : view.value.answer))

/** 模板答复的正文。 */
const template = computed(() => (notice.value?.presentation === 'response' ? notice.value.text : null))

/** 错误提示文案；模板答复不算错误。 */
const errorText = computed(() => (notice.value !== null && notice.value.presentation !== 'response' ? notice.value.text : null))

/** 可复制的回答正文；没有正文时退回提示文案。 */
const copyText = computed(() => [answer.value?.text, template.value].filter((part): part is string => typeof part === 'string' && part !== '').join('\n\n') || notice.value?.text || '')

/** 是否已经有回答内容；没有时思考区标题算「进行中」。 */
const hasResponse = computed(() => copyText.value !== '')

/** 是否允许继续生成；与 store 的判定同源。 */
const canContinue = computed(() => canContinueReply(props.message))

/** 复制正文；非安全上下文可能失败，失败给提示。 */
const copy = async () => {
  try {
    await navigator.clipboard.writeText(copyText.value)
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
</script>

<template>
  <div class="message message--assistant">
    <ReplyArea v-if="!refused" :message="message" :view="view" :streaming="streaming" :has-response="hasResponse" />

    <MarkdownContent v-if="answer !== null" class="content" :content="answer.markdown" :loading="streaming" :sources="view.sources" />
    <MarkdownContent v-if="template !== null" class="content" :content="template" :loading="false" />
    <p v-else-if="answer === null && !streaming" class="muted">{{ t('messageThinkStopped') }}</p>

    <p v-if="errorText !== null" class="error" role="alert">{{ errorText }}</p>

    <div class="actions">
      <NButton v-if="message.error" text size="tiny" :disabled="streaming" @click="regenerate">{{ t('retry') }}</NButton>
      <NButton v-if="copyText !== ''" text size="tiny" @click="copy">{{ t('copy') }}</NButton>
      <NButton text size="tiny" :disabled="streaming || refused" @click="regenerate">{{ t('regenerate') }}</NButton>
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
