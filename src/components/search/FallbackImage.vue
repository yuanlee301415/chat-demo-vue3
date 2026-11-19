<script setup lang="ts">
import { shallowRef, watch } from 'vue'

const props = defineProps<{
  /** 图片地址；空字符串直接走兜底 */
  src: string
}>()

type LoadState = 'loading' | 'error' | 'loaded'

const state = shallowRef<LoadState>(props.src ? 'loading' : 'error')

watch(
  () => props.src,
  (value) => {
    state.value = value ? 'loading' : 'error'
  },
)
</script>

<template>
  <div class="fallback-image">
    <img v-if="state !== 'error'" :src="src" alt="" :class="{ 'fallback-image__img--hidden': state !== 'loaded' }" @load="state = 'loaded'" @error="state = 'error'" />
    <div v-if="state === 'error'" class="fallback-image__fallback"><slot name="fallback" /></div>
    <div v-if="state === 'loading'" class="fallback-image__skeleton" />
  </div>
</template>

<style scoped>
.fallback-image {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.fallback-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fallback-image__img--hidden {
  display: none;
}

.fallback-image__fallback,
.fallback-image__skeleton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
</style>
