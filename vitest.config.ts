import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
  // 与 vite.config.ts 的 define 对齐，测试里也能 import 使用 __API_ORIGIN__ 的模块。
  define: { __API_ORIGIN__: JSON.stringify('https://api.deepseek.com') },
  resolve: {
    // 与 tsconfig `paths` / vite `resolve.alias` 保持一致。
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
