<script setup lang="ts">
import { computed, ref } from 'vue'

const count = ref(0)
const status = computed(() => (count.value === 0 ? '等待交互' : `已点击 ${count.value} 次`))
</script>

<template>
  <main class="app">
    <h1 class="title">chat-demo · Vue 3</h1>
    <p class="status">{{ status }}</p>
    <button class="action" type="button" @click="count += 1">点击验证</button>
    <p class="hint">P0-01 spike：仅用于验证 SFC / TS / scoped CSS 与 dev、build、preview。</p>
  </main>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  max-width: 480px;
  padding: 32px;
  font-family: system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

.title {
  margin: 0;
  font-size: 20px;
}

.status {
  margin: 0;
  color: #4b5563;
}

.action {
  padding: 6px 14px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
}

.action:hover {
  border-color: #9ca3af;
}

.hint {
  margin: 0;
  color: #9ca3af;
  font-size: 12px;
}
</style>
