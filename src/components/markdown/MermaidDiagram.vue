<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, watch } from 'vue'

import { useThemeMode } from '../../app/useThemeMode'
import { useI18n } from '../../i18n'
import { renderMermaid } from '../../services/markdown/mermaid'

const props = defineProps<{
  /** Mermaid 源码 */
  code: string
  /** 回复是否仍在流式生成 */
  loading: boolean
}>()

const { t } = useI18n()
const { isDark } = useThemeMode()
const svg = shallowRef('')
const displayedCode = shallowRef<string | null>(null)
const failedCode = shallowRef<string | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let runId = 0

onScopeDispose(() => clearTimeout(timer))

/** 流式绘制最新内容、保留上次有效图；回答结束后才显示渲染错误。 */
watch(
  [() => props.code, () => props.loading, isDark],
  ([, loading], _previous, onCleanup) => {
    const id = ++runId
    let cancelled = false
    const isCancelled = () => cancelled || id !== runId
    onCleanup(() => {
      cancelled = true
      clearTimeout(timer)
    })

    /** 绘制一段源码；内容已显示或本次已取消时跳过。 */
    const draw = async (input: string) => {
      if (isCancelled() || input === displayedCode.value) {
        return
      }
      const result = await renderMermaid(input, isDark.value, isCancelled)
      if (result !== null && !isCancelled()) {
        displayedCode.value = input
        svg.value = result
        failedCode.value = null
      }
    }

    /** 用最新源码绘制；失败时流式阶段退回最后一个完整行。 */
    const tick = async () => {
      const input = props.code
      try {
        await draw(input)
      } catch {
        if (isCancelled()) {
          return
        }
        if (loading) {
          // 流式片段的末行可能包含未完成的节点，仅绘制前面的完整行。
          const text = input.trimEnd()
          const lineEnd = Math.max(text.lastIndexOf('\n'), text.lastIndexOf('\r'))
          const prefix = text.slice(0, Math.max(0, lineEnd))
          // 已显示的内容覆盖当前前缀时保持图形。
          if (prefix && !displayedCode.value?.startsWith(prefix)) {
            try {
              await draw(prefix)
            } catch {
              // 前缀也可能尚未构成完整语法，保留已有图。
            }
          }
        } else {
          svg.value = ''
          failedCode.value = input
        }
      }
      // 当前帧结束后绘制最新片段，连续输入合并为一次绘制。
      if (!isCancelled() && loading) {
        timer = setTimeout(() => void tick(), 100)
      }
    }

    void tick()
  },
  { immediate: true },
)

/** 状态文案：空内容 / 渲染失败 / 生成中。 */
const status = computed(() => {
  if (!props.code.trim()) {
    return props.loading ? t('mermaidLoading') : t('mermaidEmpty')
  }
  if (!props.loading && failedCode.value === props.code) {
    return t('mermaidRenderFail')
  }
  return t('mermaidLoading')
})
</script>

<template>
  <div v-if="!svg" class="md-mermaid-status" role="status">{{ status }}</div>
  <div v-else class="md-mermaid-diagram" v-html="svg" />
</template>
