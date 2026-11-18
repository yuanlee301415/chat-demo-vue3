<script setup lang="ts">
import {
  NButton,
  NCard,
  NConfigProvider,
  NEmpty,
  NSpace,
  NSwitch,
  darkTheme,
  dateZhCN,
  zhCN,
} from 'naive-ui'
import { computed, ref } from 'vue'

import { themeOverrides } from './app/theme'
import { ICON_NAMES } from './components/base/iconNames'

const isDark = ref(false)
const theme = computed(() => (isDark.value ? darkTheme : null))
</script>

<template>
  <NConfigProvider :theme="theme" :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="themeOverrides">
    <div class="page" :class="{ 'page--dark': isDark }">
      <NCard class="card" title="P0-03 图标与 NaiveUI 冒烟">
        <NSpace vertical :size="20">
          <NSpace align="center" :size="12">
            <NSwitch v-model:value="isDark" aria-label="切换深色主题" />
            <span class="hint">{{ isDark ? '深色' : '浅色' }} · 图标颜色跟随 currentColor</span>
          </NSpace>

          <NSpace :size="12">
            <NButton type="primary">主按钮</NButton>
            <NButton>默认按钮</NButton>
            <NButton secondary>次要按钮</NButton>
            <NButton text>文字按钮</NButton>
          </NSpace>

          <div class="icons">
            <div v-for="name in ICON_NAMES" :key="name" class="icon-cell">
              <AppIcon :name="name" :size="20" />
              <span class="icon-name">{{ name }}</span>
            </div>
          </div>

          <NSpace align="center" :size="10">
            <span class="hint">尺寸 14 / 16 / 20 / 24</span>
            <AppIcon name="new-chat" :size="14" />
            <AppIcon name="new-chat" :size="16" />
            <AppIcon name="new-chat" :size="20" />
            <AppIcon name="new-chat" :size="24" />
          </NSpace>

          <NEmpty />
        </NSpace>
      </NCard>
    </div>
  </NConfigProvider>
</template>

<style scoped>
.page {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  box-sizing: border-box;
  padding: 40px 24px;
  overflow: auto;
  background: #f5f6f8;
  transition: background-color 0.2s;
}

.page--dark {
  background: #101014;
}

.card {
  width: 100%;
  max-width: 720px;
}

.hint {
  color: #6b7280;
  font-size: 13px;
}

.icons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 10px;
}

.icon-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 10px 6px;
  border: 1px solid rgb(128 128 128 / 20%);
  border-radius: 6px;
}

.icon-name {
  color: #6b7280;
  font-size: 11px;
  word-break: break-all;
  text-align: center;
}
</style>
