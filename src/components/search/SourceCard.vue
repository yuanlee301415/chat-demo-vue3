<script setup lang="ts">
import { computed } from 'vue'

import type { Source } from '../../services/chat/view'
import { formatDate } from '../../utils/format'
import SiteLogo from './SiteLogo.vue'

const props = defineProps<{
  /** 搜索结果中的一条来源 */
  source: Source
}>()

/** 发布日期，YYYY/MM/DD；解析失败时原样显示。 */
const date = computed(() => (props.source.publishedAt ? (formatDate(props.source.publishedAt, '/') ?? props.source.publishedAt) : ''))
</script>

<template>
  <a class="anchor" :href="source.url" target="_blank" rel="noreferrer">
    <div class="card">
      <div class="meta">
        <SiteLogo :url="source.siteIcon" class="siteIcon" />
        <span v-if="source.siteName" class="siteName">{{ source.siteName }}</span>
        <span v-if="source.siteName && date" class="divider" />
        <span v-if="date" class="date">{{ date }}</span>
      </div>
      <div class="title">{{ source.title }}</div>
      <div v-if="source.snippet" class="snippet">{{ source.snippet }}</div>
    </div>
  </a>
</template>

<style scoped>
.anchor {
  display: block;
  color: inherit;
  text-decoration: none;
}

.card {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.meta {
  display: flex;
  gap: 6px;
  align-items: center;
  padding-top: var(--search-view-card-meta-padding-top, 0);
  font: var(--search-view-card-meta-font, 500 12px/17px var(--dsw-font-family));
}

.siteIcon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
}

.siteName {
  overflow: hidden;
  color: var(--search-view-card-secondary-color, var(--dsw-alias-label-secondary));
  white-space: nowrap;
  text-overflow: ellipsis;
}

.divider {
  width: 1px;
  height: 12px;
  margin: 0 3px;
  background-color: var(--dsw-alias-border-l3);
}

.date {
  flex-shrink: 0;
  font-weight: 400;
  color: var(--search-view-card-secondary-color, var(--dsw-alias-label-secondary));
}

.title {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  font: var(--search-view-card-title-font, 500 16px/25px var(--dsw-font-family));
  color: var(--dsw-alias-label-primary);
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.snippet {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  font-size: 13px;
  line-height: 20px;
  color: var(--search-view-card-secondary-color, var(--dsw-alias-label-secondary));
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
