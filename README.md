# chat-demo-vue

- [DeepSeek chat-demo](https://github.com/deepseek-ai/chat-demo) 的 **Vue 3 + TypeScript** 重构版：桌面端本地聊天示例，浏览器直连 DeepSeek API，会话与附件全部保存在本机。
- `chat-demo` 参考项目，本地目录：`E:\Harness\chat-demo`

> 这是社区重构版本，用于学习和本地试用，不是 DeepSeek 官方产品。

## 功能

- 多会话：自动标题、重命名、删除、按时间分组、删除全部对话
- 消息分支：编辑提问、重新生成、版本切换、停止与继续生成
- 流式回复：深度思考、联网搜索、打开网页、页内查找、正文引用与来源面板
- 附件：选择 / 拖拽 / 粘贴上传，失败重试，图片与文档分别走不同上传用途
- Markdown：GFM、代码块高亮、KaTeX 公式、Mermaid 图表、引用角标与来源卡片
- 界面：明暗主题（含跟随系统）、位置设置、固定中文文案、桌面端布局

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Vue 3（Composition API + `<script setup>`）、Pinia setup stores |
| 语言 / 构建 | TypeScript（`strict`）、Vite |
| UI | NaiveUI（直接使用，不做包装组件）、本地 SVG 图标 |
| 存储 | IndexedDB（`idb`）、localStorage |
| 内容渲染 | mdast / micromark、Prism、KaTeX、Mermaid |

## 环境要求

- Node.js `>=22.12`
- pnpm 12（`package.json` 的 `packageManager` 固定了版本，可用 `corepack enable` 启用）

## 快速开始

```bash
pnpm install
pnpm dev
```

终端会打印本地地址（端口见 `vite.config.ts` 的 `DEFAULT_PORT`）。

首次打开后，在左下角 **设置 → 数据管理** 填入 API Key。没有 Key 时点击发送会自动打开设置并停在「数据管理」，不会发出请求。

## 脚本

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 启动开发服务器（仅绑定本机回环地址） |
| `pnpm build` | 先跑类型检查，再构建到 `dist/` |
| `pnpm preview` | 构建后用 Vite 预览产物 |
| `pnpm preview:dist` | 直接预览已有的 `dist/` |
| `pnpm type` | `vue-tsc --noEmit` + 构建配置的类型检查 |
| `pnpm lint` / `lint:fix` | ESLint（Vue + TypeScript） |
| `pnpm format` / `format:check` | Prettier 写入 / 校验 |
| `pnpm test` / `test:watch` | Vitest（核心纯逻辑单元测试） |
| `pnpm docs:fields` | 可选的导出类型字段注释审计 |

## 构建与部署

- `pnpm build` 产出 `dist/`，静态资源在 `dist/static/`。
- Vite `base` 为 `./`，产物可部署在任意静态服务器的根路径或子路径（GitHub Pages、Nginx 等）。
- `dist/` 不支持直接双击以 `file://` 打开，请用静态服务器或 `pnpm preview:dist`。
- API 地址在构建期注入（默认 `https://api.deepseek.com`）；需要在构建时改写时，见 `vite.config.ts` 导出的 `createConfig({ apiOrigin })`。

## 数据与隐私

- 设置（API Key、主题、位置、深度思考 / 智能搜索、侧栏状态）保存在 **localStorage**，键前缀由 `src/services/appNamespace.ts` 的 `APP_NAMESPACE` 派生。
- 会话、消息与附件原件保存在 **IndexedDB**（库名同为 `APP_NAMESPACE`，含 `sessions` / `sessionSummaries` / `files` 三张表）。
- 除 DeepSeek API（聊天、搜索、Files 上传）外不向任何第三方发送数据。
- 不读取、不迁移、不删除旧 `chat-demo` 的 IndexedDB / localStorage。
- API Key 以明文保存在本机浏览器，且页面没有配置 CSP；这是本地 Demo 的取舍，请勿部署到共享环境。
- 「删除所有对话」会清空本机会话、附件与未发送草稿，不可恢复。

## 浏览器支持与边界

- 桌面端：Chrome / Edge 105+、Safari 16+、Firefox 110+。
- 不支持：移动端布局与触摸交互、语音输入 / 朗读、历史导入导出、界面语言切换、`file://`。

## 目录结构

```text
src/
  app/          外壳（App.vue）、主题、全局样式
  components/   base / chatInput / markdown / messages / search / session / settings / sider
  services/     api（SSE 与错误）、chat（分支、视图、存储）、markdown、附件、位置
  stores/       session / stream / drafts / uploads / settings / ui / runtime
  i18n/         固定中文文案（zh.ts 为唯一来源）
  assets/icons/ 本地 SVG 图标
```

## 测试

Vitest 覆盖核心纯逻辑：分支树、上下文裁剪、视图派生、IndexedDB、SSE 解析、Markdown 解析、错误分类、位置与设置等。不包含组件测试、E2E 与视觉回归。

## 文档

- [`VUE3_REWRITE_PLAN.md`](VUE3_REWRITE_PLAN.md)：重构目标、技术决策、分阶段实施与验收标准
- [`CHANGELOGS.md`](CHANGELOGS.md)：每个步骤的计划、决策、验证与遗留
- [`AGENTS.md`](AGENTS.md)：维护者约定（工作流、注释规范、单一事实来源）

## License

[MIT](LICENSE)。上游 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) 同为 MIT。
