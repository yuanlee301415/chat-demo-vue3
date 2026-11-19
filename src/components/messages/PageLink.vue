<script setup lang="ts">
import { NTooltip } from 'naive-ui'

import type { PageItem } from '../../services/chat/view'

defineProps<{
  /** 打开的网页 */
  page: PageItem
  /** 失败时的提示文案 */
  failedTip?: string
}>()
</script>

<template>
  <span class="page" :class="page.status === 'failed' ? 'pageFailed' : 'pageDone'">
    <NTooltip :disabled="page.status !== 'failed'">
      <template #trigger>
        <span v-if="page.status === 'failed'" class="pageText">{{ page.title }}</span>
        <a v-else class="pageText" :href="page.url" target="_blank" rel="noreferrer">{{ page.title }}</a>
      </template>
      {{ failedTip }}
    </NTooltip>
    <span class="pageIcon"><AppIcon name="arrow-up-right" :size="14" /></span>
  </span>
</template>

<style scoped>
.page {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  margin-right: 6px;
  white-space: nowrap;
}

.pageText {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  font: var(--dsw-font-xs-13);
  color: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration-line: underline;
  text-decoration-style: dotted;
  text-decoration-color: var(--dsw-alias-label-caption);
  text-underline-offset: 4px;
  transition: color 0.2s;
}

.pageIcon {
  position: relative;
  bottom: 1px;
  display: flex;
}

.pageDone .pageText {
  color: var(--dsw-alias-label-secondary);
}

.pageDone .pageText:hover {
  color: var(--dsw-alias-label-primary);
  text-decoration-color: var(--dsw-alias-label-tertiary);
}

.pageFailed .pageText,
.pageFailed .pageIcon {
  color: var(--dsw-alias-label-caption);
  cursor: not-allowed;
}
</style>
