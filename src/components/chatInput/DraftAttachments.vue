<script setup lang="ts">
import { NButton, NSpin } from 'naive-ui'
import { computed } from 'vue'

import { useI18n } from '../../i18n'
import { formatSize, getExtension } from '../../services/attachments'
import { useDraftsStore } from '../../stores/drafts'
import { useSettingsStore } from '../../stores/settings'
import { useUploadsStore } from '../../stores/uploads'

const props = defineProps<{
  /** 草稿所属会话；null 表示新对话 */
  sessionId: string | null
}>()

const { t } = useI18n()
const drafts = useDraftsStore()
const uploads = useUploadsStore()
const settings = useSettingsStore()

/** 当前草稿的附件。 */
const attachments = computed(() => drafts.getDraft(props.sessionId).attachments)

/** 上传任务状态；没有任务时视为 idle。 */
const statusOf = (id: string): string => uploads.taskOf(id)?.status ?? 'idle'

/** 失败原因文案；非失败为空串。 */
const errorOf = (id: string): string => {
  const task = uploads.taskOf(id)
  return task?.status === 'error' ? t(task.error.key, task.error.params) : ''
}

/** 重试上传。 */
const retry = (id: string) => {
  drafts.retryAttachment(props.sessionId, id, settings.apiKey ?? '')
}

/** 从草稿移除附件并取消上传。 */
const remove = (id: string) => {
  drafts.removeAttachment(props.sessionId, id)
}
</script>

<template>
  <ul v-if="attachments.length > 0" class="attachments">
    <li v-for="attachment in attachments" :key="attachment.id" class="card">
      <img v-if="attachment.previewUrl" class="card__preview" :src="attachment.previewUrl" alt="" />
      <span v-else class="card__ext">{{ getExtension(attachment.file.name) || 'FILE' }}</span>

      <div class="card__info">
        <span class="card__name" :title="attachment.file.name">{{ attachment.file.name }}</span>
        <span class="card__meta">{{ formatSize(attachment.file.size) }}</span>
        <NSpin v-if="statusOf(attachment.id) === 'uploading'" :size="12" />
        <span v-else-if="statusOf(attachment.id) === 'error'" class="card__error">{{ errorOf(attachment.id) }}</span>
      </div>

      <div class="card__actions">
        <NButton v-if="statusOf(attachment.id) === 'error'" text size="tiny" @click="retry(attachment.id)">{{ t('retry') }}</NButton>
        <NButton text size="tiny" aria-label="移除附件" @click="remove(attachment.id)">×</NButton>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 4px 4px 0;
  list-style: none;
}

.card {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 240px;
  padding: 6px 8px;
  border: 1px solid rgb(128 128 128 / 24%);
  border-radius: 10px;
}

.card__preview {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 6px;
}

.card__ext {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #6b7280;
  font-size: 9px;
  background: rgb(128 128 128 / 12%);
  border-radius: 6px;
}

.card__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card__name {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__meta {
  color: #8a8f99;
  font-size: 11px;
}

.card__error {
  color: #d64545;
  font-size: 11px;
}

.card__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: auto;
}
</style>
