import { computed, shallowRef, watch } from 'vue'

import type { AssistantMessage } from '../../services/chat/types'
import { buildReplyView, type ReplyView, type Source } from '../../services/chat/view'

/** 来源元数据是否完全一致。 */
const sameSource = (a: Source, b: Source) => a.url === b.url && a.title === b.title && a.siteName === b.siteName && a.publishedAt === b.publishedAt && a.snippet === b.snippet && a.siteIcon === b.siteIcon && a.index === b.index

/**
 * 助手回复 → 界面视图（步骤时间线、正文、来源）。
 * 来源内容未变时复用旧数组，避免每帧文本增量都让 Markdown 重新解析引用。
 */
export const useReplyView = (message: () => AssistantMessage, streaming: () => boolean) => {
  const raw = computed(() => buildReplyView(message(), streaming()))
  const sources = shallowRef<Source[]>(raw.value.sources)

  watch(raw, (next) => {
    const previous = sources.value
    if (previous.length !== next.sources.length || !previous.every((source, index) => sameSource(source, next.sources[index]))) {
      sources.value = next.sources
    }
  })

  return computed<ReplyView>(() => (raw.value.sources === sources.value ? raw.value : { ...raw.value, sources: sources.value }))
}
