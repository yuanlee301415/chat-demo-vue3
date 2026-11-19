<script setup lang="ts">
import type { Source } from '../../services/chat/view'
import SiteLogo from './SiteLogo.vue'

defineProps<{
  /** 来源列表；只显示前 4 个站点图标 */
  sources: Source[]
}>()
</script>

<template>
  <span class="group">
    <SiteLogo v-for="source in sources.slice(0, 4)" :key="source.url" :url="source.siteIcon" class="thumbnail" />
  </span>
</template>

<style scoped>
.group {
  display: inline-flex;
  margin-left: 6px;
  user-select: none;
}

.thumbnail {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-left: -4px;
  box-shadow:
    0 0 0 1px var(--search-row-site-logo-color, var(--dsw-alias-bg-base)),
    0 0 0 1px var(--dsw-alias-bg-base);
  transition: box-shadow 0.2s;
}

.thumbnail:first-of-type {
  margin-left: 0;
}
</style>
