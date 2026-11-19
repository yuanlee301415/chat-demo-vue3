<script setup lang="ts">
import { computed } from 'vue'

import { ICON_SVGS, type IconName } from './iconNames'

const props = withDefaults(
  defineProps<{
    /**
     * 图标名，唯一来源是 `ICON_NAMES`。
     *
     * @see IconName 合法图标名的联合类型
     */
    name: IconName
    /** 视觉尺寸（px）。SVG 只有 viewBox，缩放不损失清晰度。 */
    size?: number
  }>(),
  { size: 16 },
)

const svg = computed(() => ICON_SVGS[props.name])
</script>

<template>
  <span class="app-icon" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true" v-html="svg" />
</template>

<style scoped>
.app-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
}

.app-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
