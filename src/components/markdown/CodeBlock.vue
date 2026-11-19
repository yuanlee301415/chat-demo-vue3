<script setup lang="ts">
import { useMessage } from 'naive-ui'
import Prism from 'prismjs'
import { computed, onScopeDispose, shallowRef, watch } from 'vue'

import { useI18n } from '../../i18n'
import { getHighlightLang, isHighlightLoaded, loadHighlight } from '../../services/markdown/highlight'
import MermaidDiagram from './MermaidDiagram.vue'

const props = defineProps<{
  /** 代码原文 */
  code: string
  /** 围栏语言名；未标注时为 text */
  infostring: string
  /** 回复是否仍在流式生成 */
  loading: boolean
}>()

const { t } = useI18n()
const toast = useMessage()

const isMermaid = computed(() => props.infostring.toLowerCase() === 'mermaid')
const showDiagram = shallowRef(true)
const lang = computed(() => getHighlightLang(props.infostring))
const loaded = shallowRef(lang.value !== null && isHighlightLoaded(lang.value))

watch(
  lang,
  (value, _previous, onCleanup) => {
    if (value === null) {
      loaded.value = false
      return
    }
    if (isHighlightLoaded(value)) {
      loaded.value = true
      return
    }
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    void loadHighlight(value).then(() => {
      if (!cancelled) {
        loaded.value = true
      }
    })
  },
  { immediate: true },
)

/** 代码高亮；语言包未加载或未支持时按纯文本转义。 */
const html = computed(() => {
  const name = lang.value !== null && loaded.value ? lang.value : 'plaintext'
  const grammar = Prism.languages[name]
  return grammar ? Prism.highlight(props.code, grammar, name) : escapeHtml(props.code)
})

/** 把纯文本转成可放进 `<pre>` 的 HTML。 */
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const copied = shallowRef(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined
onScopeDispose(() => clearTimeout(copyTimer))

/** 复制代码；非安全上下文可能失败，失败给提示。 */
const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
  } catch {
    toast.error(t('copyFailed'))
    return
  }
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <div class="md-code-block">
    <div class="md-code-block-banner">
      <div class="info">
        <div v-if="isMermaid" class="switch" :aria-label="t('mermaidSwitchLabel')">
          <button type="button" class="button" :aria-pressed="showDiagram" @click="showDiagram = true">{{ t('mermaidDiagram') }}</button>
          <button type="button" class="button" :aria-pressed="!showDiagram" @click="showDiagram = false">{{ t('mermaidCode') }}</button>
        </div>
        <span v-else class="name">{{ infostring }}</span>
        <button type="button" class="button" @click="copy">
          <AppIcon :name="copied ? 'check' : 'copy'" :size="14" />
          <span>{{ t(copied ? 'copied' : 'copy') }}</span>
        </button>
      </div>
    </div>
    <MermaidDiagram v-if="isMermaid && showDiagram" :code="code" :loading="loading" />
    <pre v-else v-html="html" />
  </div>
</template>

<style scoped>
.info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px;
}

.name {
  margin-left: 8px;
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code);
  font-size: 12px;
  line-height: 18px;
}

.button {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  user-select: none;
  background: transparent;
  border: none;
  border-radius: 8px;
}

.button:active {
  background-color: var(--dsw-alias-interactive-bg-hover);
}

@media (hover: hover) {
  .button:hover {
    background-color: var(--dsw-alias-interactive-bg-hover);
  }
}

.switch {
  display: flex;
  gap: 4px;
}

.switch .button[aria-pressed='true'] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-markdown-code-block);
}
</style>
