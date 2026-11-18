import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * dev 与 preview 共用端口；两者不会同时运行。
 * 用 8091 而非计划里的 8090：8090 被原 chat-demo 的 rspack dev server 以通配地址占用。
 */
const PORT = 8091

/** 只绑 IPv4 回环：Vite 8 默认绑 ::1，会让 http://127.0.0.1 访问失败。 */
const HOST = '127.0.0.1'

export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    assetsDir: 'static',
    target: ['chrome105', 'edge105', 'safari16', 'firefox110'],
  },
  server: { host: HOST, port: PORT, strictPort: true },
  preview: { host: HOST, port: PORT, strictPort: true },
})
