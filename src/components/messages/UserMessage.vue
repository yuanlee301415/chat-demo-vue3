<script setup lang="ts">
import { formatSize } from '../../services/attachments'
import type { UserMessage } from '../../services/chat/types'

defineProps<{
  /** 用户消息 */
  message: UserMessage
}>()
</script>

<template>
  <div class="message message--user">
    <div class="bubble">
      <p v-if="message.content" class="bubble__text">{{ message.content }}</p>
      <ul v-if="message.files.length > 0" class="files">
        <li v-for="file in message.files" :key="file.id" class="files__item">{{ file.name }} · {{ formatSize(file.size) }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.message--user {
  display: flex;
  justify-content: flex-end;
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
</style>
