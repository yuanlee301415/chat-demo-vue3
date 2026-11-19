<script setup lang="ts">
import { computed } from 'vue'

import { useI18n } from '../../i18n'
import type { Session } from '../../services/chat/types'
import { useStreamStore } from '../../stores/stream'
import MessageList from '../messages/MessageList.vue'
import ChatInput from '../chatInput/ChatInput.vue'

const props = defineProps<{
  /** 已加载的会话详情 */
  session: Session
}>()

const { t } = useI18n()
const stream = useStreamStore()

/** 标题为空时回退占位文案；重命名后随 store 即时更新。 */
const title = computed(() => props.session.title || t('untitledChat'))
</script>

<template>
  <section class="session">
    <header class="session__header">
      <h1 class="session__title">{{ title }}</h1>
    </header>
    <MessageList :session="session" :streaming="stream.isStreaming(session.id)" />

    <footer class="session__footer">
      <ChatInput :session-id="session.id" />
      <p class="session__caveat">{{ t('contentCaveat') }}</p>
    </footer>
  </section>
</template>

<style scoped>
.session {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.session__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  min-height: 60px;
  padding: 0 18px;
  border-bottom: 1px solid rgb(128 128 128 / 18%);
}

.session__title {
  margin: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session__footer {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 12px 24px 16px;
  border-top: 1px solid rgb(128 128 128 / 12%);
}

.session__caveat {
  margin: 0;
  color: #8a8f99;
  font-size: 11px;
}
</style>
