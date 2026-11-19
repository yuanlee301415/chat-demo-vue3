<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import { buildMessageVersions, getVisibleMessages, type MessageVersions } from '../../services/chat/branches'
import type { Message, Session } from '../../services/chat/types'
import { useStreamStore } from '../../stores/stream'
import AssistantMessage from './AssistantMessage.vue'
import BranchSwitcher from './BranchSwitcher.vue'
import UserMessage from './UserMessage.vue'

const props = defineProps<{
  /** 会话详情 */
  session: Session
  /** 该会话是否正在生成 */
  streaming: boolean
}>()

const stream = useStreamStore()
const scroller = ref<HTMLElement | null>(null)
const stick = ref(true)

/** 可见消息 + 版本信息；同一父节点下超过一个版本才显示切换器。 */
const items = computed(() => {
  const versions = buildMessageVersions(props.session, new Map())
  return getVisibleMessages(props.session).map((message) => {
    const info = versions.get(message.id)
    const multiple: MessageVersions | undefined = info !== undefined && info.ids.length > 1 ? info : undefined
    return { message, versions: multiple }
  })
})

/** 是否靠近底部：只有靠近时才自动跟随。 */
const onScroll = () => {
  const el = scroller.value
  if (el !== null) {
    stick.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }
}

/** 滚到底部（仅在跟随状态）。 */
const scrollToBottom = async () => {
  await nextTick()
  const el = scroller.value
  if (el !== null && stick.value) {
    el.scrollTop = el.scrollHeight
  }
}

/** 判断某条消息是否正在流式生成。 */
const isStreamingMessage = (message: Message) => props.streaming && message.role === 'assistant' && (message.status === 'pending' || message.status === 'streaming')

/** 切换版本。 */
const selectVersion = (id: string) => {
  stream.selectVersion(props.session.id, id)
}

watch(() => props.session.messages.length, scrollToBottom)
onMounted(scrollToBottom)
</script>

<template>
  <div ref="scroller" class="list" @scroll.passive="onScroll">
    <div class="list__inner">
      <div v-for="item in items" :key="item.message.id" class="list__item">
        <UserMessage v-if="item.message.role === 'user'" :message="item.message" />
        <AssistantMessage v-else :message="item.message" :streaming="isStreamingMessage(item.message)" />
        <BranchSwitcher v-if="item.versions !== undefined" :versions="item.versions" @select="selectVersion" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.list__inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(760px, 100% - 48px);
  margin: 0 auto;
  padding: 24px 0 32px;
}

.list__item {
  display: flex;
  flex-direction: column;
}
</style>
