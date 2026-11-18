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

const isDark = ref(false)
const theme = computed(() => (isDark.value ? darkTheme : null))
</script>

<template>
  <NConfigProvider :theme="theme" :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="themeOverrides">
    <div class="page" :class="{ 'page--dark': isDark }">
      <NCard class="card" title="NaiveUI 接入验证">
        <NSpace vertical :size="16">
          <NSpace align="center" :size="12">
            <NSwitch v-model:value="isDark" aria-label="切换深色主题" />
            <span class="hint">{{ isDark ? '深色' : '浅色' }} · P0-02 spike：验证 locale / 主题 / themeOverrides</span>
          </NSpace>

          <NSpace :size="12">
            <NButton type="primary">主按钮</NButton>
            <NButton>默认按钮</NButton>
            <NButton secondary>次要按钮</NButton>
            <NButton text>文字按钮</NButton>
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
  padding: 40px;
  overflow: auto;
  background: #f5f6f8;
  transition: background-color 0.2s;
}

.page--dark {
  background: #101014;
}

.card {
  width: 100%;
  max-width: 560px;
}

.hint {
  color: #6b7280;
  font-size: 13px;
}
</style>
