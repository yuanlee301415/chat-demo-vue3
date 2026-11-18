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
  optimizeDeps: {
    /**
     * 这三个库只在用到时 import，但 Vite 的依赖扫描仍会发现它们并预构建。
     * 显式登记的原因：把「预构建」固定在启动后一次完成，避免首次点击时才优化新依赖、
     * 触发 dev 页面 reload 打断刚发出的请求。预构建在后台跑，不阻塞首次打开（实测 ready 355 ms）。
     * Prism 是 CJS，语言包又是副作用脚本，必须走预构建；Mermaid/KaTeX 一并登记只为行为稳定。
     */
    include: [
      'mermaid',
      'katex',
      'katex/contrib/mhchem',
      'prismjs',
      'prismjs/components/prism-bash.min.js',
      'prismjs/components/prism-json.min.js',
      'prismjs/components/prism-typescript.min.js',
    ],
  },
  server: { host: HOST, port: PORT, strictPort: true },
  preview: { host: HOST, port: PORT, strictPort: true },
})
