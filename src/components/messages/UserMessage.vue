<script setup lang="ts">
import { NButton, NInput, useMessage } from 'naive-ui'
import { computed, nextTick, ref } from 'vue'

import { useI18n } from '../../i18n'
import { formatSize } from '../../services/attachments'
import type { UserMessage } from '../../services/chat/types'
import { useStreamStore } from '../../stores/stream'
import { useUiStore } from '../../stores/ui'

const props = defineProps<{
  /** 所属会话 id */
  sessionId: string
  /** 用户消息 */
  message: UserMessage
}>()

const { t } = useI18n()
const stream = useStreamStore()
const ui = useUiStore()
const toast = useMessage()
const editing = ref(false)
const draft = ref('')
const inputRef = ref<InstanceType<typeof NInput> | null>(null)

/** 允许保存：有正文，或保留原附件。 */
const canSave = computed(() => draft.value.trim() !== '' || props.message.files.length > 0)

/** 进入编辑并聚焦。 */
const startEdit = () => {
  draft.value = props.message.content
  editing.value = true
  void nextTick(() => inputRef.value?.focus())
}

/** 放弃编辑。 */
const cancelEdit = () => {
  editing.value = false
}

/** 保存编辑：新增同父问题版本，旧回答仍可切回。 */
const saveEdit = () => {
  if (!canSave.value || !ui.ensureApiKey()) {
    return
  }
  if (stream.edit(props.sessionId, props.message.id, draft.value.trim())) {
    editing.value = false
  }
}

/** 复制原文；失败给提示。 */
const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    toast.success(t('copy'))
  } catch {
    toast.error(t('copyFailed'))
  }
}
</script>

<template>
  <div class="message message--user">
    <div v-if="editing" class="editor">
      <NInput ref="inputRef" v-model:value="draft" type="textarea" :autosize="{ minRows: 1, maxRows: 8 }" :aria-label="t('editMessage')" />
      <div class="editor__actions">
        <NButton size="small" quaternary @click="cancelEdit">{{ t('cancel') }}</NButton>
        <NButton size="small" type="primary" :disabled="!canSave" @click="saveEdit">{{ t('send') }}</NButton>
      </div>
    </div>

    <template v-else>
      <div class="bubble">
        <p v-if="message.content" class="bubble__text">{{ message.content }}</p>
        <ul v-if="message.files.length > 0" class="files">
          <li v-for="file in message.files" :key="file.id" class="files__item">{{ file.name }} · {{ formatSize(file.size) }}</li>
        </ul>
      </div>
      <div class="actions">
        <NButton text size="tiny" :disabled="!message.content" @click="copy">{{ t('copy') }}</NButton>
        <NButton text size="tiny" :aria-label="t('editMessage')" @click="startEdit">{{ t('editMessage') }}</NButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.message--user {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgb(77 107 254 / 10%);
}

.bubble__text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.files {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.files__item {
  color: #6b7280;
  font-size: 12px;
}

.editor {
  width: min(560px, 80%);
  padding: 8px;
  border: 1px solid rgb(128 128 128 / 24%);
  border-radius: 12px;
}

.editor__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
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
