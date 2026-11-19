<script setup lang="ts">
import { NButton, NInput, NTooltip } from 'naive-ui'
import { computed, ref } from 'vue'

import { useI18n } from '../../i18n'
import { useDraftsStore } from '../../stores/drafts'
import { useSettingsStore } from '../../stores/settings'
import { useStreamStore } from '../../stores/stream'
import { useUploadsStore } from '../../stores/uploads'

const props = defineProps<{
  /** 草稿所属会话；null 表示新对话 */
  sessionId: string | null
}>()

const { t } = useI18n()
const drafts = useDraftsStore()
const uploads = useUploadsStore()
const settings = useSettingsStore()
const stream = useStreamStore()
const focused = ref(false)

/** 与 drafts store 双向绑定，切会话不串草稿。 */
const text = computed({
  get: () => drafts.getDraft(props.sessionId).text,
  set: (value: string) => {
    drafts.setText(props.sessionId, value)
  },
})

/** 当前草稿的附件；上传任务按附件 id 关联。 */
const attachments = computed(() => drafts.getDraft(props.sessionId).attachments)

/** 附件是否全部上传成功；没有附件时视为已就绪。 */
const attachmentsReady = computed(() => attachments.value.every((attachment) => uploads.taskOf(attachment.id)?.status === 'done'))

/** 是否满足发送条件：有正文或附件，且附件已传完。 */
const canSend = computed(() => (text.value.trim() !== '' || attachments.value.length > 0) && attachmentsReady.value)

/** 当前会话是否正在生成。 */
const streaming = computed(() => props.sessionId !== null && stream.isStreaming(props.sessionId))

/** 提交草稿；成功后 store 会清空草稿并选中新会话。 */
const submit = () => {
  if (!canSend.value || streaming.value) {
    return
  }
  stream.sendDraft(props.sessionId)
}

/** 停止本次生成。 */
const stop = () => {
  if (props.sessionId !== null) {
    stream.stop(props.sessionId)
  }
}

/** 回车发送、Shift+回车换行；输入法组合中不处理。 */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }
  event.preventDefault()
  submit()
}
</script>

<template>
  <div class="chat-input" :class="{ 'chat-input--focused': focused }">
    <NInput v-model:value="text" type="textarea" :placeholder="t('chatInputPlaceholderChat')" :autosize="{ minRows: 1, maxRows: 8 }" :bordered="false" @focus="focused = true" @blur="focused = false" @keydown="onKeydown" />

    <div class="chat-input__bar">
      <div class="chat-input__toggles">
        <NTooltip placement="top">
          <template #trigger>
            <NButton quaternary circle size="small" :type="settings.thinking ? 'primary' : 'default'" :aria-label="t('thinkingSwitch')" @click="settings.setThinking(!settings.thinking)">
              <template #icon>
                <AppIcon name="think" />
              </template>
            </NButton>
          </template>
          {{ t('thinkingSwitch') }}
        </NTooltip>
        <NTooltip placement="top">
          <template #trigger>
            <NButton quaternary circle size="small" :type="settings.search ? 'primary' : 'default'" :aria-label="t('search')" @click="settings.setSearch(!settings.search)">
              <template #icon>
                <AppIcon name="search" />
              </template>
            </NButton>
          </template>
          {{ t('search') }}
        </NTooltip>
      </div>

      <NTooltip placement="top">
        <template #trigger>
          <NButton v-if="streaming" circle size="small" type="default" :aria-label="t('chatInputStopButtonTooltip')" @click="stop">
            <template #icon>
              <AppIcon name="stop" />
            </template>
          </NButton>
          <NButton v-else circle size="small" type="primary" :disabled="!canSend" :aria-label="t('send')" @click="submit">
            <template #icon>
              <AppIcon name="send" />
            </template>
          </NButton>
        </template>
        {{ streaming ? t('chatInputStopButtonTooltip') : t('send') }}
      </NTooltip>
    </div>
  </div>
</template>

<style scoped>
.chat-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: min(760px, 100%);
  padding: 8px 8px 8px 4px;
  background: rgb(128 128 128 / 6%);
  border: 1px solid rgb(128 128 128 / 24%);
  border-radius: 16px;
  transition: border-color 0.15s;
}

.chat-input--focused {
  border-color: #4d6bfe;
}

.chat-input__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.chat-input__toggles {
  display: flex;
  gap: 4px;
}
</style>
