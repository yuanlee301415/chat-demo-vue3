import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
  resolve: {
    // 与 tsconfig `paths` / vite `resolve.alias` 保持一致。
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
