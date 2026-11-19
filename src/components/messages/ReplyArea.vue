<script setup lang="ts">
import { NTooltip } from 'naive-ui'
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'

import { useI18n } from '../../i18n'
import type { AssistantMessage } from '../../services/chat/types'
import { getAreaTitle, isDeepSearchKind, isImageSearchKind, type FindStep, type OpenStep, type ReplyView, type SearchStep, type Step, type ThinkingStep } from '../../services/chat/view'
import MarkdownContent from '../markdown/MarkdownContent.vue'
import SiteLogo from '../search/SiteLogo.vue'
import PageLink from './PageLink.vue'

const props = defineProps<{
  /** 助手回复 */
  message: AssistantMessage
  /** 由回复推导的视图 */
  view: ReplyView
  /** 是否仍在流式生成 */
  streaming: boolean
  /** 是否已经有正文；没有时标题算「进行中」 */
  hasResponse: boolean
}>()

const { t } = useI18n()

/** 当前时间；流式期间每秒刷新，用于思考用时与搜索词轮播。 */
const now = shallowRef(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

/** 启停每秒刷新。 */
const setTicker = (active: boolean) => {
  clearInterval(timer)
  timer = undefined
  if (active) {
    timer = setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }
}

watch(
  () => props.streaming,
  (streaming) => {
    setTicker(streaming)
  },
  { immediate: true },
)

onScopeDispose(() => clearInterval(timer))

/** 思考区是否默认展开。 */
const open = ref(true)
const titleActive = computed(() => props.streaming && !props.hasResponse)
const stopped = computed(() => !props.streaming && !props.hasResponse)
const visible = computed(() => props.view.steps.length > 0 || (props.message.thinking === true && props.streaming))
const thinking = computed(() => props.message.thinking ?? props.view.steps.some((step) => step.type === 'thinking'))

/** 折叠区标题；未开启思考时为空。 */
const title = computed(() => (thinking.value ? getAreaTitle(props.view, props.streaming, now.value, props.hasResponse) : null))

/** 步骤的稳定 key。 */
const stepKey = (step: Step, index: number) => (step.type === 'thinking' || step.type === 'text' || step.type === 'search' ? step.key : `${step.type}-${index}`)

/** 是否最后一个步骤：最后一个不画连接线。 */
const isLast = (index: number) => index === props.view.steps.length - 1

/** 思考块是否仍在输出。 */
const thinkingActive = (step: ThinkingStep) => {
  const last = step.blocks.at(-1)
  return props.streaming && last?.startedAt !== undefined && last.endedAt === undefined
}

/** 搜索行在整轮停止时的失败文案。 */
const searchInterrupted = (step: SearchStep) => step.status === 'failed' && !props.streaming && props.message.status === 'stopped'

/** 当前轮播到的搜索词；多个查询时每 2 秒换一个。 */
const activeQuery = (step: SearchStep) => step.queries[Math.floor(now.value / 2000) % step.queries.length] ?? ''

/** 搜索完成后的总结文案。 */
const searchSummary = (step: SearchStep) =>
  t(isDeepSearchKind(step.kind) ? (step.results.length === 1 ? 'toolSearch1Result' : 'toolSearchResults') : step.results.length === 1 ? 'messageSearchResult' : 'messageSearchResults', {
    count: step.results.length,
  })

/** 打开网页是否全部失败。 */
const allPagesFailed = (step: OpenStep) => step.pages.every((page) => page.status === 'failed')

/** 页内查找是否全部失败。 */
const allPatternsFailed = (step: FindStep) => step.patterns.every((item) => item.status === 'failed')
</script>

<template>
  <div v-if="visible" class="area">
    <div v-if="title" class="title" @click="open = !open">
      <span class="titleIcon" :class="{ stoppedIcon: stopped }"><AppIcon name="think" :size="16" /></span>
      <span class="titleText" :class="{ shimmer: titleActive }">{{ title }}</span>
      <AppIcon :name="open ? 'chevron-down' : 'chevron-right'" :size="14" />
    </div>
    <div v-if="open || !title" class="steps">
      <template v-for="(step, index) in view.steps" :key="stepKey(step, index)">
        <div v-if="step.type === 'thinking'" class="content ds-think-content" :class="{ lastItem: isLast(index) }">
          <span class="dot"><span class="dotInner" :class="{ inactive: !thinkingActive(step) }" /></span>
          <MarkdownContent :content="step.blocks.map((block) => block.thinking).join('')" :loading="thinkingActive(step)" :disable-link="true" />
        </div>

        <div v-else-if="step.type === 'text'" class="content ds-think-content" :class="{ lastItem: isLast(index) }">
          <span class="dot"><span class="dotInner inactive" /></span>
          <MarkdownContent :content="step.markdown" :loading="streaming && isLast(index)" :sources="view.sources" />
        </div>

        <div v-else-if="step.type === 'search'" class="row" :class="{ withLine: !isLast(index) }">
          <span class="rowIcon">
            <AppIcon :name="step.status === 'failed' ? 'search-warning' : 'search'" :size="14" />
          </span>
          <template v-if="step.status === 'wip'">
            <template v-if="step.queries.length > 0">
              <span class="prefix">{{ t('toolSearchIntro') }}</span>
              <span class="query">{{ activeQuery(step) }}</span>
            </template>
            <span v-else>{{ t(isImageSearchKind(step.kind) ? 'imageSearching' : 'messageSearching') }}</span>
          </template>
          <span v-else-if="searchInterrupted(step)">{{ t('searchStopped') }}</span>
          <span v-else-if="step.status === 'failed'">{{ t('toolSearchFail') }}</span>
          <span v-else-if="step.results.length === 0">{{ t(isDeepSearchKind(step.kind) ? 'toolSearchNoResult' : 'messageSearchNoResult') }}</span>
          <template v-else>
            <span class="summary">{{ searchSummary(step) }}</span>
            <span class="thumbs">
              <SiteLogo v-for="source in step.results.slice(0, 4)" :key="source.url" :url="source.siteIcon" class="thumb" />
            </span>
          </template>
        </div>

        <div v-else-if="step.type === 'open'" class="tool" :class="{ withLine: !isLast(index) }">
          <span class="rowIcon toolIcon">
            <AppIcon :name="allPagesFailed(step) ? 'browse-warning' : 'browse'" :size="14" />
          </span>
          <div class="toolBody">
            <template v-if="allPagesFailed(step)">{{ t('toolOpenFail') }}</template>
            <template v-else>
              <span class="intro">{{ t(step.pages.length === 1 ? 'toolOpenOneIntro' : 'toolOpensIntro', { count: step.pages.length }) }}</span>
              <PageLink v-for="page in step.pages.slice(0, 5)" :key="page.id" :page="page" :failed-tip="t('toolOpenFailTooltip')" />
            </template>
          </div>
        </div>

        <div v-else-if="step.type === 'find'" class="tool" :class="{ withLine: !isLast(index) }">
          <span class="rowIcon toolIcon">
            <AppIcon :name="allPatternsFailed(step) ? 'browse-warning' : 'browse'" :size="14" />
          </span>
          <div class="toolBody">
            <template v-if="allPatternsFailed(step)">{{ t('toolFindFail') }}</template>
            <template v-else>
              <span class="intro">{{ t('toolFindIntro') }}</span>
              <NTooltip v-for="item in step.patterns" :key="item.id" :disabled="item.status !== 'failed'">
                <template #trigger>
                  <span class="chip" :class="{ chipFailed: item.status === 'failed' }">
                    <span v-if="item.status !== 'wip'" class="chipIcon">
                      <AppIcon :name="item.status === 'failed' ? 'close-fill' : 'checked'" :size="12" />
                    </span>
                    <span class="chipText">{{ item.pattern }}</span>
                  </span>
                </template>
                {{ item.status === 'failed' ? t('toolFindFailTooltip') : '' }}
              </NTooltip>
            </template>
          </div>
        </div>

        <div v-else-if="step.type === 'read_link'" class="tool" :class="{ withLine: !isLast(index) }">
          <span class="rowIcon toolIcon"><AppIcon name="link" :size="14" /></span>
          <div class="toolBody">
            <span class="intro shimmer">{{ t('readingLink') }}</span>
            <PageLink v-for="link in step.links" :key="link.id" :page="link" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.area {
  margin-bottom: 10px;
}

.title {
  display: flex;
  align-items: center;
  height: 34px;
  margin-bottom: 2px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.title:hover {
  color: var(--dsw-alias-label-primary);
}

.titleIcon {
  display: flex;
  margin-right: 6px;
  color: var(--dsw-alias-brand-primary);
}

.stoppedIcon {
  color: var(--dsw-alias-label-tertiary);
}

.titleText {
  margin-right: 6px;
  font: var(--dsw-font-markdown-base);
}

.shimmer {
  color: transparent;
  background: linear-gradient(90deg, var(--dsw-alias-label-secondary) 0%, var(--dsw-alias-label-secondary) 40%, var(--dsw-alias-label-caption) 50%, var(--dsw-alias-label-secondary) 60%, var(--dsw-alias-label-secondary) 100%) 0 0 / 300% 100%;
  background-clip: text;
  animation: shimmer 2s ease-out infinite;
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: 0 0;
  }
}

.withLine::after,
.content::after {
  position: absolute;
  top: 31px;
  left: 7.5px;
  width: 1px;
  height: calc(100% - 24px);
  background-color: var(--dsw-alias-label-dimmed);
  content: '';
}

.content {
  position: relative;
  padding: 5px 0 5px 22px;
}

.content.lastItem {
  padding-bottom: 0;
}

.content.lastItem::after {
  height: calc(100% - 32px);
}

.dot {
  position: absolute;
  top: 9px;
  left: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.dotInner {
  width: 5px;
  height: 5px;
  background: var(--dsw-alias-brand-primary);
  border-radius: 50%;
  animation: pulse 1.5s linear infinite;
}

.dotInner.inactive {
  background-color: var(--dsw-alias-label-tertiary);
  animation: none;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    animation-timing-function: ease-out;
  }

  40% {
    transform: scale(1.3);
    animation-timing-function: linear;
  }

  60% {
    transform: scale(1.3);
    animation-timing-function: ease-out;
  }

  100% {
    transform: scale(1);
  }
}

.rowIcon {
  display: flex;
  flex-shrink: 0;
  margin-right: 6px;
  padding: 1px;
}

.row {
  position: relative;
  display: flex;
  align-items: center;
  max-width: 100%;
  height: 34px;
  font: var(--dsw-font-markdown-small);
  color: var(--dsw-alias-label-secondary);
}

.prefix,
.summary {
  flex-shrink: 0;
  font-variant: tabular-nums;
}

.query {
  margin-left: 6px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
}

.thumbs {
  display: inline-flex;
  margin-left: 6px;
  user-select: none;
}

.thumb {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-left: -4px;
  box-shadow:
    0 0 0 1px var(--search-row-site-logo-color, var(--dsw-alias-bg-base)),
    0 0 0 1px var(--dsw-alias-bg-base);
  transition: box-shadow 0.2s;
}

.thumb:first-of-type {
  margin-left: 0;
}

.tool {
  position: relative;
  display: flex;
  max-width: 100%;
  padding: 5px 0;
  font: var(--dsw-font-markdown-small);
  color: var(--dsw-alias-label-secondary);
}

.toolIcon {
  margin-top: 4px;
}

.toolBody {
  display: flex;
  flex-wrap: wrap;
  row-gap: 6px;
  align-items: center;
  width: calc(100% - 30px);
  overflow: hidden;
}

.intro {
  display: inline-block;
  margin-right: 6px;
  font-variant: tabular-nums;
}

.chip {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  min-width: 0;
  max-width: 540px;
  height: 20px;
  margin-right: 4px;
  padding: 0 5px;
  font: var(--dsw-font-xs-13);
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  background: var(--dsw-alias-markdown-tag);
  border-radius: 6px;
}

.chipFailed {
  color: var(--dsw-alias-label-caption);
  cursor: not-allowed;
}

.chipIcon {
  display: flex;
  margin-right: 2px;
}

.chipText {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 思考与过程性文字用小号 Markdown。 */
.content :deep(.ds-markdown) {
  font: var(--dsw-font-markdown-small);
  color: var(--dsw-alias-label-secondary);
}

.content :deep(.ds-markdown h1),
.content :deep(.ds-markdown h2),
.content :deep(.ds-markdown h3),
.content :deep(.ds-markdown h4),
.content :deep(.ds-markdown h5),
.content :deep(.ds-markdown h6) {
  margin: 12px 0;
  font: var(--dsw-font-markdown-small-strong);
}

.content :deep(.ds-markdown .ds-markdown-paragraph) {
  margin: 12px 0;
}

.content :deep(.ds-markdown ul),
.content :deep(.ds-markdown ol) {
  margin: 12px 0;
}

.content :deep(.ds-markdown li > .ds-markdown-paragraph) {
  margin: 2px 0;
}

.content :deep(.ds-markdown li:not(:first-child)) {
  margin-top: 2px;
}

.content :deep(.ds-markdown blockquote) {
  margin: 12px 0 0;
}

.content :deep(.ds-markdown hr) {
  margin: 28px 0;
}
</style>
