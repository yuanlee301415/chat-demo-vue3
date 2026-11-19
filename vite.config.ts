import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'
import { type Plugin, type UserConfig } from 'vite'

/** dev 与 preview 共用端口；两者不会同时运行。 */
const DEFAULT_PORT = 8091

/** 只绑 IPv4 回环：Vite 默认绑 ::1，会让 http://127.0.0.1 访问失败。 */
const DEFAULT_HOST = '127.0.0.1'

const DEFAULT_API_ORIGIN = 'https://api.deepseek.com'

/** 桌面端浏览器目标：`build.target`、lightningcss 与 browserslist 查询都从这里派生。 */
const BROWSER_TARGETS = { chrome: 105, edge: 105, safari: 16, firefox: 110 } as const

const BROWSER_QUERIES = Object.entries(BROWSER_TARGETS).map(([browser, version]) => `${browser} >= ${version}`)

const BUILD_TARGET = Object.entries(BROWSER_TARGETS).map(([browser, version]) => `${browser}${version}`)

const targets = browserslistToTargets(browserslist(BROWSER_QUERIES))

const fileUrl = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url))

const readVersion = (): string => {
  const raw = readFileSync(fileUrl('./package.json'), 'utf8')
  return (JSON.parse(raw) as { version: string }).version
}

/** 把构建版本写进 HTML，便于线上排查对应的是哪次构建。 */
const injectAppVersion = (): Plugin => {
  const version = readVersion()
  return {
    name: 'inject-app-version',
    transformIndexHtml: {
      order: 'pre',
      handler: () => [
        {
          tag: 'meta',
          attrs: { name: 'application-version', content: version },
          injectTo: 'head',
        },
      ],
    },
  }
}

/** MIT 许可要求产物随附许可文本；`dist` 每次构建都会清空，因此放进 closeBundle。 */
const copyLicense = (): Plugin => {
  let outDir = 'dist'
  return {
    name: 'copy-license',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const source = fileUrl('./LICENSE')
      if (existsSync(source)) {
        copyFileSync(source, fileUrl(`./${outDir}/LICENSE`))
      }
    },
  }
}

export interface AppConfigOptions {
  /** 构建期注入的 API 源；默认官方地址，本地可用代理地址覆盖。 */
  apiOrigin?: string
  /** dev/preview 服务器；两者共用同一端口。 */
  server?: {
    host?: string
    port?: number
  }
}

/**
 * 生成 Vite 配置。
 * 单独导出工厂是为了让其他入口（测试、代理、多环境构建）能复用同一套规则。
 */
export const createConfig = (options: AppConfigOptions = {}): UserConfig => {
  const apiOrigin = options.apiOrigin ?? DEFAULT_API_ORIGIN
  const host = options.server?.host ?? DEFAULT_HOST
  const port = options.server?.port ?? DEFAULT_PORT

  return {
    base: './',
    plugins: [vue(), injectAppVersion(), copyLicense()],
    define: {
      __API_ORIGIN__: JSON.stringify(apiOrigin),
    },
    resolve: {
      // 与 tsconfig `paths` / vitest.config.ts 的 alias 保持一致。
      alias: { '@': fileUrl('./src') },
    },
    css: {
      transformer: 'lightningcss',
      lightningcss: { targets },
    },
    build: {
      assetsDir: 'static',
      target: BUILD_TARGET,
    },
    optimizeDeps: {
      /**
       * 这三个库只在用到时 import，但 Vite 的依赖扫描仍会发现它们并预构建。
       * 显式登记的原因：把「预构建」固定在启动后一次完成，避免首次点击时才优化新依赖、
       * 触发 dev 页面 reload 打断刚发出的请求。预构建在后台跑，不阻塞首次打开。
       * Prism 是 CJS、语言包是副作用脚本，必须走预构建；Mermaid/KaTeX 一并登记只为行为稳定。
       */
      include: ['mermaid', 'katex', 'katex/contrib/mhchem', 'prismjs', 'prismjs/components/prism-bash.min.js', 'prismjs/components/prism-json.min.js', 'prismjs/components/prism-typescript.min.js'],
    },
    server: { host, port, strictPort: true },
    /**
     * preview 不钉端口：dev 固定 8091，preview 用 Vite 默认 4173，两者可以同时开着；
     * 需要固定端口时用 `vite preview --port <n>`。
     */
    preview: { host },
  }
}

export default createConfig()
