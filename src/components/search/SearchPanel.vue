<script setup lang="ts">
import { NButton } from 'naive-ui'

import { useI18n } from '../../i18n'
import { useUiStore } from '../../stores/ui'
import SourceCard from './SourceCard.vue'

const { t } = useI18n()
const ui = useUiStore()
</script>

<template>
  <aside v-if="ui.searchPanelOpen" class="panel" :aria-label="t('searchResult')">
    <div class="header">
      <h2 class="title">{{ t('searchResult') }}</h2>
      <NButton quaternary circle size="small" :aria-label="t('close')" @click="ui.closeSearchPanel()">
        <AppIcon name="close" :size="16" />
      </NButton>
    </div>
    <div class="content">
      <SourceCard v-for="source in ui.searchPanelSources" :key="source.url" :source="source" class="item" />
    </div>
  </aside>
</template>

<style scoped>
.panel {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  box-sizing: border-box;
  width: calc(50vw - 4rem);
  max-width: 390px;
  height: 100%;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  border-left: 1px solid var(--dsw-alias-border-l2);
}

.header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  box-sizing: border-box;
  height: 60px;
  padding: 0 14px 0 20px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.title {
  flex: 1;
  margin: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.content {
  --search-view-card-meta-font: var(--dsw-font-xs-13);
  --search-view-card-meta-padding-top: 2px;
  --search-view-card-secondary-color: var(--dsw-alias-label-tertiary);
  --search-view-card-title-font: 500 14px/22px var(--dsw-font-family);

  flex: 1;
  min-height: 0;
  padding: 8px;
  overflow-y: auto;
}

.item {
  margin-bottom: 6px;
  padding: 12px;
  border-radius: 12px;
  transition: background-color var(--ds-transition-duration) var(--ds-ease-in-out);
}

.item:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}
</style>
