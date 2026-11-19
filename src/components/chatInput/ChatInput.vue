<script setup lang="ts">
import { NButton, NInput, NTooltip, useMessage } from 'naive-ui'
import { computed, ref } from 'vue'

import { useI18n } from '../../i18n'
import { ACCEPT } from '../../services/attachments'
import { useDraftsStore } from '../../stores/drafts'
import { useSettingsStore } from '../../stores/settings'
import { useStreamStore } from '../../stores/stream'
import { useUiStore } from '../../stores/ui'
import { useUploadsStore } from '../../stores/uploads'
import DraftAttachments from './DraftAttachments.vue'

const props = defineProps<{
  /** 草稿所属会话；null 表示新对话 */
  sessionId: string | null
}>()

const { t } = useI18n()
const toast = useMessage()
const drafts = useDraftsStore()
const uploads = useUploadsStore()
const settings = useSettingsStore()
const stream = useStreamStore()
const ui = useUiStore()
const focused = ref(false)
const dragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

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

/** 提交草稿；没有 API Key 时先打开设置的数据页。 */
const submit = () => {
  if (!canSend.value || streaming.value || !ui.ensureApiKey()) {
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

/** 追加一批文件；校验失败用 toast 说明并整批丢弃。 */
const addFiles = (files: File[]) => {
  if (files.length === 0) {
    return
  }
  const error = drafts.addFiles(props.sessionId, files, settings.apiKey ?? '')
  if (error !== null) {
    toast.warning(t(error.key, error.params))
  }
}

/** 文件选择框变更。 */
const onPick = (event: Event) => {
  const input = event.target as HTMLInputElement
  addFiles([...(input.files ?? [])])
  input.value = ''
}

/** 打开系统文件选择框。 */
const openPicker = () => {
  fileInput.value?.click()
}

/** 拖拽释放：取文件并交给草稿。 */
const onDrop = (event: DragEvent) => {
  dragging.value = false
  addFiles([...(event.dataTransfer?.files ?? [])])
}

/** 粘贴：有文件时添加附件并阻止默认粘贴，纯文本交给输入框。 */
const onPaste = (event: ClipboardEvent) => {
  const files = [...(event.clipboardData?.files ?? [])]
  if (files.length > 0) {
    event.preventDefault()
    addFiles(files)
  }
}
</script>

<template>
  <div class="chat-input" :class="{ 'chat-input--focused': focused, 'chat-input--dragging': dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop" @paste="onPaste">
    <DraftAttachments :session-id="sessionId" />

    <NInput v-model:value="text" type="textarea" :placeholder="t('chatInputPlaceholderChat')" :autosize="{ minRows: 1, maxRows: 8 }" :bordered="false" @focus="focused = true" @blur="focused = false" @keydown="onKeydown" />

    <div class="chat-input__bar">
      <div class="chat-input__toggles">
        <NButton quaternary circle size="small" :aria-label="t('uploadFile')" @click="openPicker">
          <template #icon>
            <AppIcon name="paperclip" />
          </template>
        </NButton>
        <input ref="fileInput" class="chat-input__file" type="file" multiple :accept="ACCEPT" @change="onPick" />
        <NTooltip placement="top">
          <template #trigger>
            <NButton quaternary circle size="small" :type="settings.thinking ? 'primary' : 'default'" :aria-label="t('thinkingSwitch')" @click="settings.setThinking(!settings.thinking)">
              <template #icon>
                <AppIcon name="think" />
              </template>
            </NButton>
          </template>
          {{ t('deactivatedThinkTooltip') }}
        </NTooltip>
        <NTooltip placement="top">
          <template #trigger>
            <NButton quaternary circle size="small" :type="settings.search ? 'primary' : 'default'" :aria-label="t('search')" @click="settings.setSearch(!settings.search)">
              <template #icon>
                <AppIcon name="search" />
              </template>
            </NButton>
          </template>
          {{ t('deactivatedSearchTooltip') }}
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

.chat-input--dragging {
  border-color: #4d6bfe;
  background: rgb(77 107 254 / 8%);
}

.chat-input__file {
  display: none;
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
