<script setup lang="ts">
import { shallowRef, watch } from 'vue'

import { ensureKatex, type Katex } from '../../services/markdown/katex'

const props = withDefaults(
  defineProps<{
    /** 公式源码（不含 $ 定界符） */
    value: string
    /** 行内公式；false 为块级 */
    inline?: boolean
  }>(),
  { inline: false },
)

/** renderToString 外层包裹的标签，组件自己渲染外层，这里切掉 */
const KATEX_WRAPPER = {
  inline: ['<span class="katex">', '</span>'],
  display: ['<span class="katex-display"><span class="katex">', '</span></span>'],
} as const

const initial = ensureKatex()
const katex = shallowRef<Katex | null>(initial instanceof Promise ? null : initial)
if (initial instanceof Promise) {
  void initial.then(
    (instance) => {
      katex.value = instance
    },
    () => {
      // 加载失败保持 fallback，展示公式原文。
    },
  )
}

const html = shallowRef(props.value)
const mode = shallowRef<'katex' | 'fallback'>('fallback')
/** 上一次成功渲染的结果：流式时公式还没写完，报错就先沿用旧结果。 */
let previous: { html: string } | null = null

watch(
  [() => props.value, () => props.inline, katex],
  ([value, inline, instance]) => {
    if (!instance) {
      html.value = value
      mode.value = 'fallback'
      return
    }
    try {
      const [prefix, suffix] = KATEX_WRAPPER[inline ? 'inline' : 'display']
      const rendered = instance.renderToString(value, { throwOnError: true, strict: false, displayMode: !inline }).slice(prefix.length, -suffix.length)
      previous = { html: rendered }
      html.value = rendered
      mode.value = 'katex'
    } catch {
      if (previous) {
        html.value = previous.html
        mode.value = 'katex'
        return
      }
      html.value = value
      mode.value = 'fallback'
    }
  },
  { immediate: true },
)
</script>

<template>
  <p v-if="!inline && mode === 'fallback'" class="ds-markdown-paragraph">{{ html }}</p>
  <span v-else-if="!inline" class="katex-display ds-markdown-math"><span class="katex" v-html="html" /></span>
  <template v-else-if="mode === 'fallback'">{{ html }}</template>
  <span v-else class="katex" v-html="html" />
</template>
