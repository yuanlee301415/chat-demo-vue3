<script setup lang="ts">
import {
  NButton,
  NCard,
  NConfigProvider,
  NDivider,
  NEmpty,
  NSpace,
  NSwitch,
  darkTheme,
  dateZhCN,
  zhCN,
} from 'naive-ui'
import { computed, reactive, ref } from 'vue'

import { themeOverrides } from './app/theme'
import { ICON_NAMES } from './components/base/iconNames'
import { highlightCode, renderMathHtml, renderMermaidSvg } from './spikes/markdown-libs'

const isDark = ref(false)
const theme = computed(() => (isDark.value ? darkTheme : null))

const MERMAID_CODE = `flowchart LR
  A[输入] --> B{需要思考?}
  B -->|是| C[深度思考]
  B -->|否| D[直接回答]`

const TEX = String.raw`\ce{2H_{2} + O_{2} -> 2H_{2}O}`

const CODE = `type Reply = { role: 'user' | 'assistant'; text: string }

export const greet = (name: string): Reply => ({
  role: 'assistant',
  text: \`你好，\${name}\`,
})`

const mermaidSvg = ref('')
const katexHtml = ref('')
const prismHtml = ref('')
const loading = reactive({ mermaid: false, katex: false, prism: false })
const failure = ref('')

const run = async (key: keyof typeof loading, task: () => Promise<void>) => {
  loading[key] = true
  failure.value = ''
  try {
    await task()
  } catch (error) {
    failure.value = error instanceof Error ? error.message : String(error)
  } finally {
    loading[key] = false
  }
}

const loadChart = () =>
  run('mermaid', async () => {
    mermaidSvg.value = await renderMermaidSvg(MERMAID_CODE)
  })

const loadMath = () =>
  run('katex', async () => {
    katexHtml.value = await renderMathHtml(TEX)
  })

const loadCode = () =>
  run('prism', async () => {
    prismHtml.value = await highlightCode(CODE, 'typescript')
  })
</script>

<template>
  <NConfigProvider :theme="theme" :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="themeOverrides">
    <div class="page" :class="{ 'page--dark': isDark }">
      <NCard class="card" title="P0-04 动态库 spike">
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

          <NDivider />

          <NSpace vertical :size="12">
            <span class="hint">动态库：点击后才 import，首屏不应请求 mermaid / katex / prism</span>
            <NSpace :size="12">
              <NButton data-testid="load-mermaid" :loading="loading.mermaid" @click="loadChart">Mermaid</NButton>
              <NButton data-testid="load-katex" :loading="loading.katex" @click="loadMath">KaTeX</NButton>
              <NButton data-testid="load-prism" :loading="loading.prism" @click="loadCode">Prism</NButton>
            </NSpace>

            <p v-if="failure" class="failure">{{ failure }}</p>

            <div data-testid="mermaid-out" class="output" v-html="mermaidSvg" />
            <div data-testid="katex-out" class="output" v-html="katexHtml" />
            <pre data-testid="prism-out" class="output code"><code v-html="prismHtml" /></pre>
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

.output {
  min-height: 24px;
  padding: 8px 12px;
  border: 1px dashed rgb(128 128 128 / 35%);
  border-radius: 6px;
  overflow-x: auto;
}

.code {
  margin: 0;
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
}

.failure {
  margin: 0;
  color: #d03050;
  font-size: 13px;
}
</style>
