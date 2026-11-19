<script setup lang="ts">
import FallbackImage from './FallbackImage.vue'

defineProps<{
  /** 站点图标地址；缺失时显示链接图标 */
  url: string | null
}>()
</script>

<template>
  <FallbackImage :src="url ?? ''" class="logo">
    <template #fallback><AppIcon name="link" :size="12" /></template>
  </FallbackImage>
</template>

<style scoped>
.logo {
  overflow: hidden;
  background-color: var(--dsw-alias-markdown-citation);
  border-radius: 50%;
}
</style>
