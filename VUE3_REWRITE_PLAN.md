# Vue 3 + TS 重构计划（Vite + NaiveUI，Vue 最佳实践版）

> 状态：已确认，作为后续重构的执行文档。
> 范围：仅规划，不代表当前项目代码已改动。
> 目标项目：`chat-demo` 本地 Demo。
>
> 修订 2026-11-18：新增 §5「每步工作流」——每步开始前把计划/目标写入 `CHANGELOGS.md`，结束前写入关键决策始末，验证通过后按 `序号 + 目标` 提交 Git；后续章节顺延编号。

## 0. 目标与边界

**目标**：把当前 React Demo 重构为 Vue 3 + TypeScript + Vite 应用。业务范围保持最小，但**视图层与状态层按 Vue 3 最佳实践重写**，不做“把 React 代码逐行翻译成 Vue”的兼容式迁移。

**保留**：多会话、自动标题、重命名/删除、编辑/重新生成/分支、流式/思考/搜索/链接阅读/引用、停止/续写、附件上传/粘贴/拖拽、Markdown/高亮/KaTeX/Mermaid、明暗主题、中文文案、位置设置、删除全部会话。

**移除**：

- `file://` 支持；只支持 Vite dev / preview / 静态服务器 / Pages。
- Rspack；统一 Vite。
- 旧数据兼容；全新 DB，不读取、不迁移旧 IndexedDB/localStorage。
- 移动端；删除移动布局、抽屉、`visualViewport`、触摸处理。
- 语音；删除录音、转写、朗读、频谱、TTS 设置。
- 历史导入导出；删除 ZIP/归档子系统与相关设置。
- E2E/视觉测试；只保留核心模块单元测试。

**“最小改动”的定义**：业务逻辑文件尽量复用、功能范围最小、不新增需求；但组件、状态、组合式函数按 Vue 3 + TS 规范重写，不保留 React 的 props/render-prop/useEffect 写法。

**执行纪律**：按 §6 的阶段与步骤推进，每个步骤都走 §5 的三步闭环（开始前写计划 → 动手 → 结束前写决策 → 验证通过 → 用序号+目标提交）。没有 `CHANGELOGS.md` 条目的改动不进入 Git 历史。

## 1. 技术决策

| 决策点 | 结论 |
|---|---|
| 构建 | Vite 最新稳定版 + `@vitejs/plugin-vue`；dev 端口 8091（8090 被原项目 rspack dev server 占用），preview 用 Vite 默认 4173，两者可同时运行 |
| 框架 | Vue 3 当前稳定线（3.5.x），`<script setup lang="ts">`，不用 Vapor/RC |
| 类型 | TypeScript 6.x + `vue-tsc --noEmit`；TS 7 与 `vue-tsc` 兼容性在 Phase 0 验证 |
| UI 库 | **直接使用 NaiveUI 组件**（`NButton`/`NInput`/`NSelect`/`NModal`/`NTooltip`/`NDropdown`/`NPopover`/`NLayout`/`NTabs`/`NForm`/`useMessage`/`useDialog`），不做仿 React API 的包装器 |
| 状态 | **Pinia setup stores 按领域拆分**：session、stream、settings、uploads、drafts、ui；纯服务不直接弹 UI |
| 响应式 | 会话数据 `shallowRef` + 不可变替换；Blob/File `markRaw`；写 DB 前 `toRaw` |
| 样式 | CSS Modules + 全局 Markdown CSS 保留；Vite lightningcss；接受 NaiveUI 默认视觉，不追求 1:1 |
| 图标 | 提取为 `src/assets/icons/*.svg`；全局 `AppIcon` 组件用 `import.meta.glob(..., { query: '?raw' })` 渲染 |
| 文案 | **固定中文**：保留 `zh.ts` 与 `t()`，删除 `en.ts`、语言切换、`locale` 设置 |
| 数据 | 新库 `chat-demo-vue` v1；localStorage 前缀 `chat-demo-vue:`；无迁移、无 staging |
| 测试 | Vitest 核心模块单测；无组件测试/E2E/视觉回归 |

## 2. Vue 3 + TS 最佳实践落地

这部分是本次重构的约束，避免“能跑但不像 Vue”。

### 2.1 组件

- 一律 `<script setup lang="ts">`，`defineProps`/`defineEmits`/`defineModel`/`defineSlots` 显式类型。
- 用 `v-model` 与 `@update:value` 等 Vue 事件，不保留 React 的 `value` + `onChange` 回调式 API。
- 用插槽代替 render-prop/children 函数：`SessionItem` 的菜单用 `NDropdown` 的 trigger 插槽；`SourceCard` 悬停用 `NPopover` 的 trigger/content 插槽。
- 用 `Teleport`/NaiveUI 的 `NModal`/`NDropdown`/`NPopover` 替代 `createPortal` 与手写定位。
- 用 `useTemplateRef`/`useId`，不写字符串 ref 或手写 id。
- 派生数据用 `computed`，副作用才用 `watch`/`watchEffect`；`onMounted`/`onBeforeUnmount`/`onScopeDispose` 负责清理监听、定时器、AbortController。
- 跨层共享的滚动、表单、搜索面板逻辑抽成 `useXxx` 组合式函数，不通过多层 props 传递。
- 禁止 `any`；外部输入用 `unknown` + 类型守卫；组件 props 不写运行时冗余校验。

### 2.2 状态

- Pinia **setup store**，按领域拆分，不把 1000 行逻辑塞回一个 store。
- 组件用 `storeToRefs` 保持响应性，不解构 store 丢响应性。
- 非响应式的 `Map`/`Set`/`AbortController` 放在 store 闭包或 `createChatRuntime()` 工厂里，**不写模块级可变全局变量**，保证测试可重置。
- 纯业务函数（`reply`/`view`/`branches`/`db`/`markdown`）不 import store、不弹 toast；错误/结果通过返回值或 store state 暴露，由组件决定如何展示。
- `settings` 作为 Pinia store，但 localStorage 读写集中在 store 的 action 中；纯函数需要配置时通过参数传入，不隐式读全局。

### 2.3 UI 反馈

- `NMessageProvider` + `useMessage` 处理 toast；`NDialogProvider` + `useDialog` 处理确认框。
- 删除自定义 `Toast`/`Modal`/`Button`/`IconButton`/`Select`/`Tooltip`/`Menu` 组件与对应 CSS；只保留 `AppIcon`。
- 服务层不直接调用 `useMessage`；store 暴露 `notice`/`error` 状态，`App.vue`/`ChatInput.vue` 监听后调用 `message`，保持领域层与 UI 解耦。

### 2.4 性能

- `sessionCache` 用 `shallowRef<Record<string, Session>>`；更新时替换会话对象，旧消息保持引用稳定。
- 流式更新继续用 rAF 批量 flush；不要每个 delta 触发整棵消息树更新。
- `MessageList` 用 `v-memo` 或拆分消息组件避免历史消息重绘。
- Markdown 保留“按渲染耗时 ×2、上限 2s”的节流；`sources` 数组做身份比较，避免流式重解析。

## 3. 关键实现

### 3.1 Vite

- `index.html` 放项目根目录，入口 `<script type="module" src="/src/main.ts">`；删除 `src/index.html`。
- `vite.config.ts` 导出 `createConfig({ apiOrigin, server })`；默认 API `https://api.deepseek.com`，支持自定义代理。`P1-01` 已验证：传 `apiOrigin` 会改写 `define.__API_ORIGIN__`，传 `server.port` 只影响 dev。
- `base: './'`；`build.assetsDir: 'static'`；`build.target` 为 `chrome105`/`edge105`/`safari16`/`firefox110`（桌面端：Chrome/Edge 105+、Safari 16+、Firefox 110+，不支持移动端，见 §0）。`P0-05` 已验证：把 `dist` 整体挂在 `/chat-demo-vue3/` 子路径下，`./static/*`、动态 chunk 与 KaTeX 字体都能正确加载。
- CSS 用 `css.transformer: 'lightningcss'` + `browserslistToTargets`，保留现有 CSS Modules。
- `define: { __API_ORIGIN__: JSON.stringify(apiOrigin) }`；`transformIndexHtml` 注入 `application-version`；`closeBundle` 拷贝 `LICENSE`。
- 不输出 `file://` 产物；README 删除“双击 index.html”说明。
- 验证 `mermaid`、`prismjs/components/*`、`katex/contrib/mhchem` 的动态导入；必要时配置 `optimizeDeps.include/exclude`。

### 3.2 NaiveUI

- `App.vue` 使用 `NConfigProvider` 包裹：

```vue
<NConfigProvider
  :theme="isDark ? darkTheme : null"
  :locale="zhCN"
  :date-locale="dateZhCN"
  :theme-overrides="overrides"
>
  <NMessageProvider>
    <NDialogProvider>
      <NLayout ...>...</NLayout>
    </NDialogProvider>
  </NMessageProvider>
</NConfigProvider>
```

- 固定中文：`zhCN`/`dateZhCN`；不再根据 locale 切换。
- 布局：`NLayout` + `NLayoutSider`（可折叠侧栏）+ 自定义消息区；聊天列表、消息气泡、Markdown 仍用现有 CSS。
- 控件映射：
  - `Button` → `NButton`（`type`/`secondary`/`tertiary`/`error`/`size`）；
  - `IconButton` → `NButton circle quaternary` + `NTooltip` + `AppIcon`；
  - `Modal` → `NModal preset="card"`；
  - `Select` → `NSelect` + `v-model:value`；
  - `Tooltip` → `NTooltip`；
  - `Menu` → `NDropdown`；
  - `HoverCard` → `NPopover`；
  - 删除确认 → `useDialog().warning`；
  - 提示 → `useMessage()`。
- 接受 NaiveUI 的默认视觉；只通过 `themeOverrides` 调整主色、圆角等少量 token，不做像素级还原。

### 3.3 图标

- 从 `icons.tsx` 提取**仍在使用**的图标到 `src/assets/icons/{name}.svg`；仅语音/移动端/导入导出使用的图标删除。
- SVG 保留 `viewBox`、`fill="none"`、`fill="currentColor"`，去掉固定宽高。
- 生成 `src/components/base/iconNames.ts`（`IconName` 联合类型）。
- 全局 `AppIcon.vue`：
  - `import.meta.glob('../../assets/icons/*.svg', { eager: true, query: '?raw', import: 'default' })`；
  - props：`name: IconName`、`size?: number`；
  - 渲染 `<span class="app-icon" :style="{ width: size+'px', height: size+'px' }" aria-hidden="true" v-html="svg" />`；
  - `v-html` 仅渲染本地静态 SVG，ESLint 对该文件定点豁免。
- `main.ts` 注册全局组件；`src/components.d.ts` 声明 `GlobalComponents.AppIcon`。

### 3.4 固定中文的 I18n

- 保留 `src/i18n/zh.ts` 与 `src/i18n/index.ts`；删除 `en.ts`。
- `index.ts` 简化：

```ts
import { zh } from './zh'

export type TranslationKey = keyof typeof zh

export const t = (key: TranslationKey, params?: Record<string, string | number>) =>
  zh[key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = params?.[name]
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : placeholder
  })

export const useI18n = () => ({ t })
```

- 删除 `useTranslate`、`translate` 的 locale 参数、`settings.locale`、语言切换 UI、`isChineseBrowser`、`document.lang` 监听。
- `index.html` 固定 `lang="zh-CN"`；NaiveUI 固定 `zhCN`；`latestReminder` 固定中文；`location` 用 `Intl.DisplayNames('zh-CN')`；`sessionGroups`、`describeReply`、`attachments`、`drafts` 继续用 `t()`。
- 仅语音/导入导出使用的 key 可保留（最小改动），也可最后统一清理。

### 3.5 状态拆分

- `stores/session.ts`：`sessions`、`activeId`、`sessionCache`、加载/保存错误；`init`、`select`、`rename`、`remove`、`deleteAll`、`ensureLoaded`、缓存淘汰。
- `stores/stream.ts`：`streamingIds`、`send`、`regenerate`、`edit`、`continue`、`retryUpload`、`stop`；请求组装、附件补齐、SSE 消费、rAF flush。
- `stores/settings.ts`：API Key、主题、位置、思考/搜索开关、侧栏折叠；localStorage 持久化；无 `locale`、无 `ttsVoice`。
- `stores/uploads.ts`：上传任务、并发队列、错误状态。
- `stores/drafts.ts`：草稿 Map、附件、预览 URL 释放。
- `stores/ui.ts`：搜索面板、设置弹窗状态（小 store）。
- `stores/pinia.ts`：创建并导出 pinia；`main.ts` 安装。
- 非响应式运行态（`sessionAccess`、`unsavedSessions`、`pendingFiles`、`deletingSessions`、`streamFlushes`、`titleRequests`、`sessionLoads`、`initTask`）封装在 `createChatRuntime()` 工厂，由 session/stream store 使用，不写模块级可变全局。
- `deleteAll`：停止全部流 → 等 idle → 清空 DB 三张表 → 重置 store、草稿、搜索面板。

### 3.6 数据

- 新库 `chat-demo-vue` v1，仅 `sessions`、`sessionSummaries`（`fileIds` 索引）、`files`；删除 staging。
- `Session`/`Message`/`ReplyBlock`/`FileAttachment` 模型不变，继续复用 `reply`/`view`/`branches`。
- localStorage 前缀 `chat-demo-vue:`；键：`api-key`、`theme`、`location`、`thinking`、`search`、`sider-collapsed`；无 `locale`、无 `tts-voice`。
- 旧 `chat-demo` DB/localStorage 不读取、不删除。
- 附件补传/失效 `file_id` 重试逻辑保留（与导入无关）。

### 3.7 删除功能

**移动端**：删除 `MobileHeader`、`MobileSider`、`mobileSiderState`、`viewport.ts`；删除所有 `useIsMobile`/`useMobileViewport`/`usePreventPageScroll` 分支；`Sider` 用 `NLayoutSider` 折叠，不做抽屉；`SettingsDialog` 不做底部弹层；`MessageList` 只保留桌面滚动容器。

**语音**：删除 `services/speech/*`、`api/speech.ts`、`VoiceButton`、`Spectrum`、`useVoiceInput`、`ReadAloudButton`、`ReadingBars` 及 CSS；删除 `settings.ttsVoice`、`tts-voice`、TTS 设置项、`stopReadAloud` 调用。

**导入导出**：删除 `services/chat/history/*`、`backup.ts`、`fflate`、`sessionsStaging`/`filesStaging`、`importingHistory`、导入导出 UI 与确认弹窗；设置的数据页只保留 API Key 与“删除全部对话”。

## 4. 目标目录

```text
index.html
vite.config.ts
src/
  main.ts
  app/App.vue, app.css, theme.ts, theme.css, global.css
  components/
    base/AppIcon.vue, iconNames.ts
    chatInput/ChatInput.vue, DraftAttachments.vue, DragMask.vue
    files/FileCard.vue, FileIcon.vue
    markdown/Markdown.vue, MarkdownAstRenderer.ts, CodeBlock.vue, MathFormula.vue,
             MermaidDiagram.vue, Link.vue, useThrottleMarkdownRender.ts
    messages/MessageList.vue, UserMessage.vue, AssistantMessage.vue, ReplyArea.vue,
             BranchSwitcher.vue, MessageFile.vue, CopyButton.vue, useReplyView.ts
    search/SearchPanel.vue, SourceCard.vue, CitationLink.vue, SiteLogo.vue, FallbackImage.vue
    session/SessionView.vue, Welcome.vue
    settings/SettingsDialog.vue, ApiKeyField.vue, useApiKeyForm.ts
    sider/Sider.vue, SessionItem.vue
  stores/pinia.ts, session.ts, stream.ts, settings.ts, uploads.ts, drafts.ts, ui.ts, runtime.ts
  services/api/*, chat/{types,branches,reply,view,describe,db,latestReminder,sessionGroups}.ts,
           markdown/*, attachments.ts, location.ts, uploadExts.ts
  i18n/index.ts, zh.ts
  assets/icons/*.svg
  utils/*
```

## 5. 每步工作流：`CHANGELOGS.md` + Git 提交

本节是**硬约束**：所有代码改动都必须落在某个已登记步骤内。顺序不能颠倒——先写计划再写代码，先验证再提交，`CHANGELOGS.md` 的本次改动与该步骤代码进**同一个 commit**，让历史自解释。

### 5.1 三步闭环

| 时机 | 必须做的事 | 条目状态 |
|---|---|---|
| 步骤开始前 | 在 `CHANGELOGS.md` 追加该步骤条目，写清**计划与目标**：做什么、不做什么、验收标准是什么 | `进行中` |
| 步骤结束前 | 在同一序号下补齐**关键决策始末**：选了哪条路、为什么、放弃了什么、偏差与遗留 | `待提交` |
| 验证通过后 | 以 `序号 + 目标归纳` 作为 commit subject，提交该步骤全部改动（含 `CHANGELOGS.md`） | `已提交`（hash 见 `git log --grep <序号>`） |

- 验收标准在**开始前**写死，之后只能补充、不能放松；验收未通过不得提交。
- 一个步骤 = 一个 commit；`CHANGELOGS.md` 不单独提交（它随所属步骤走）。
- 纯 spike/调研类步骤没有产品代码产出时，提交文档结论同样算合法步骤。

### 5.2 条目格式与排序

`CHANGELOGS.md` 按执行顺序**自上而下追加，最新条目在文件末尾**（追加即可，不必回头改文件头部）。

```markdown
## P1-02 tsconfig / vue-tsc / ESLint / Vitest 配置

- 状态：进行中（→ 待提交 → 已提交；hash 见 `git log --grep P1-02`）
- 开始：2026-11-19 10:12

**计划与目标（开始前填写）**
- 目标：……（本步要达成的可观察结果）
- 范围：……（会动哪些文件/目录）
- 不做：……（明确排除，防止范围蔓延）
- 验收：`pnpm type` 0 错误；`pnpm lint` 0 警告；`pnpm test` 通过

**关键决策始末（结束前填写）**
- 决策：…… ｜ 备选：…… ｜ 取舍理由：……
- 偏差：计划外做了什么 / 没做什么，为什么
- 遗留：留给哪个序号（如 `P2-03`），或说明为什么可以不做

**验证记录**
- 命令：…… ｜ 结果：…… ｜ 证据：……（报错/PASS 摘要，不贴大段日志）
```

- 每条决策必须写清「为什么」和「放弃了什么」；过程记录不追求文风，但缺理由视为记录不合格。
- 同一序号下的条目**只追加不重写**，状态变更直接改 `状态` 行。
- 不把 commit hash 写进条目：提交前无法预知 hash，写死必然失真（`amend` 还会让它失效）；用 `git log --grep <序号>` 反查即可，序号本身已与提交一一对应。

### 5.3 步骤编号与粒度

- 编号 `P<阶段>-<两位序号>`，如 `P0-01`、`P3-07`；阶段内连续，**一经使用不复用、不重排、不跳号回收**。
- 阶段收尾固定一步 `P<n>-99`：执行该阶段门禁，失败则回到具体步骤修复并新增条目，不靠改验收标准过关。
- 一个步骤应能在 0.5–2 天内完成，并且能用一条命令或一份明确的手工清单判定通过；做不完就拆成两个序号。
- 步骤清单在**每个 Phase 开始时**敲定：写进该 Phase 第一步条目的「范围/遗留」里一次性登记；执行中新增或拆分步骤用**新序号**，并在原条目注明去向。
- `P0-00` 为仓库基线提交：`.editorconfig`、`.gitignore`、`README.md`、`VUE3_REWRITE_PLAN.md`、`CHANGELOGS.md` 模板。

### 5.4 提交规范

```text
P1-02 tsconfig / vue-tsc / ESLint / Vitest 配置

- 关键决策：TS 固定 6.x，vue-tsc 用 --noEmit 接入 pnpm type
- 验证：pnpm type / lint / test 全部通过
```

- subject 一行、`序号 + 目标归纳`，≤ 72 字符；**不加** `feat:`/`chore:` 前缀（序号已表达阶段与顺序）。
- commit body 写「关键决策」（一两句）与「验证」结果，便于不打开 `CHANGELOGS.md` 也能读懂历史。
- 提交前 `git status` 必须只剩本步骤的预期文件；`dist/`、`node_modules/`、`.idea/` 已被 `.gitignore` 覆盖。
- 默认只提交到本地仓库，不自动 `push`；确需推送时单独确认。
- 回滚用 `git revert <hash>`（不改写历史），并在新条目记录回滚原因与替代方案。

### 5.5 失败与异常处理

- 步骤内验证失败：**不提交**，状态退回 `进行中`，在同一序号下记录失败原因与修复过程，修好再验证。
- 步骤做不下去：在条目写 `状态：已放弃` + 原因，并登记替代步骤的新序号（旧序号标记被谁取代）。
- 发现前置步骤有缺陷：新增修复步骤序号，先修前置、再继续；不要在同一步里顺手改无关代码。
- `CHANGELOGS.md` 与实际代码不一致时，以代码与验证结果为准，先补记条目再提交。

## 6. 分阶段实施

每个 Phase 内拆成带编号的步骤（§5.3），阶段末固定一步 `P<n>-99` 执行门禁。Phase 0/1 的步骤清单直接定在此处；Phase 2–5 在各自开始时按同样粒度补登到 `CHANGELOGS.md`。

### Phase 0：Vite/NaiveUI/图标验证（2–3 天）

- **P0-00** 仓库基线：`.editorconfig`、`.gitignore`、`README.md`、本计划、`CHANGELOGS.md` 模板（首次提交）。
- **P0-01** Vite + Vue 3 + TS 最小工程：`pnpm dev`/`build`/`preview` 三条命令跑通，暂不接 NaiveUI。
- **P0-02** NaiveUI 接入：`NConfigProvider` + `zhCN`/`dateZhCN` + `darkTheme` + `themeOverrides` 草案，确认主色/圆角调整范围。
- **P0-03** 图标：从 `icons.tsx` 提取在用的 SVG 到 `src/assets/icons/`，实现全局 `AppIcon` + `iconNames.ts`，逐图标目检。
- **P0-04** 动态导入 spike：验证 `mermaid`、`prismjs/components/*`、`katex/contrib/mhchem` 在 Vite 下按需加载，定下 `optimizeDeps.include/exclude`。
- **P0-05** 产物结构：确认 `base`、`assetsDir`、Pages 子路径下资源可加载；记录浏览器 target。
- **P0-99** 门禁：`vue-tsc`/lint/`build`/`preview` 通过；spike 结论写回本文档 §3。

### Phase 1：脚手架与基础层（3–4 天）

- **P1-01** 根 `index.html` + `vite.config.ts` 定稿（`createConfig`、`define`、`transformIndexHtml`）。
- **P1-02** `tsconfig` / `vue-tsc` / ESLint / Prettier / Vitest 配置与 `pnpm type|lint|test` 脚本。
- **P1-03** `main.ts` + `App.vue` 外壳：`NConfigProvider`/`NMessageProvider`/`NDialogProvider` + `NLayout`/`NLayoutSider` 空壳。
- **P1-04** 固定中文 i18n：简化 `i18n/index.ts`，删 `en.ts`、`locale` 状态与语言切换 UI。
- **P1-05** 移除移动端/语音/导入导出相关入口文件，`grep` 清理全部引用。
- **P1-99** 门禁：空壳应用 dev/preview 可启动；类型/lint 通过；无残留死引用。

### Phase 2：状态与数据（4–5 天）

- 建议拆为：`pinia`/`runtime` 工厂 → `session` → `settings` → `uploads` → `drafts`/`ui` → 新 DB 与 `deleteAll` → 各核心模块单测（按模块分批）。
- **门禁**：单测全绿；旧数据不读取。

### Phase 3：聊天主链路（6–8 天）

- 建议拆为：布局与侧栏 → 会话视图 → 消息列表/气泡 → `ChatInput` → 发送与流式 → 停止/错误 → 编辑/重新生成/分支/续写 → 附件上传/拖拽/粘贴/重试。
- **门禁**：手工走通聊天流程；流式性能不劣于基线。

### Phase 4：Markdown/搜索/设置（4–5 天）

- 建议拆为：`Markdown` + AST 渲染器 → CodeBlock/Math/Mermaid → ReplyArea 时间线与引用 → 搜索面板/来源卡片 → 设置弹窗（主题/位置/API Key/删除全部）。
- **门禁**：Markdown 输出与旧版一致；设置项全部可用。

### Phase 5：清理与交付（2 天）

- 建议拆为：未使用依赖/文件/CSS/翻译 key 清理 → README 重写 → CI 与 Pages 配置。
- **门禁**：Windows/Linux 构建通过；`pnpm test` 通过；preview 可完整使用。

**粗估**：单人约 21–27 人日（4–6 周）；两人并行约 2–3 周。按 §5 每步一提交，约 40–55 个提交。

## 7. 测试与验收

**单元测试（Vitest，node 环境）**：

- `branches`：线性归一化、可见路径、版本切换、追加分支。
- `reply`：事件合并、思考块、引用、拒绝、续写前缀、上下文裁剪。
- `view`：时间线、来源编号、引用角标、思考用时。
- `describe`/`errors`：错误分类与提示。
- `sessionGroups`/`latestReminder`：固定中文分组与提醒字符串。
- `attachments`：扩展名/大小/数量校验、MIME/大小格式化。
- `db`：`fake-indexeddb` 下保存、读取、重命名、删除、删除全部。

**不写**：组件测试、E2E、视觉回归、性能自动化。

**手工 smoke checklist**：

- 首次打开、设置 API Key、发送/停止/重新生成/编辑/续写/分支切换。
- 思考、搜索、引用、链接阅读、代码块/公式/Mermaid。
- 附件上传/拖拽/粘贴/失败重试。
- 主题切换、位置设置、删除会话、删除全部、刷新后数据恢复。
- `pnpm dev`、`pnpm build`、`pnpm preview`、Pages 子路径。

**验收标准**：

1. `pnpm type`、`pnpm lint`、`pnpm test`、`pnpm build` 全部通过。
2. smoke checklist 全部通过。
3. 旧 `chat-demo` DB/localStorage 不被读取、不被删除；新应用首次打开为空历史。
4. 无移动端/语音/导入导出残留入口或死代码。
5. bundle 不含 React、zustand、Rspack、fflate；Mermaid/Prism/KaTeX 仍按需加载。
6. 代码符合第 2 节 Vue 最佳实践：无仿 React API 包装器、无 `any`、无模块级可变状态、组件使用 `v-model`/插槽/组合式函数。
7. 流程符合第 5 节：每个步骤在 `CHANGELOGS.md` 有完整条目（计划 + 决策 + 验证），且有一条 subject 为 `序号 + 目标` 的 commit 与之一一对应；`git log --oneline` 的序号序列与 `CHANGELOGS.md` 一致，无「无条目提交」。

**每步的最低检查**（写进该步骤的验收项，不替代阶段门禁）：

- 涉及 TS 文件：`pnpm type` 0 错误。
- 涉及新增/修改代码：`pnpm lint` 0 警告。
- 涉及纯逻辑（`branches`/`reply`/`view`/`db` 等）：`pnpm test` 相关用例通过。
- 涉及界面：在 `pnpm dev` 中完成该步骤对应的最小手工路径，并在条目「验证记录」写明点了什么、看到什么。

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| NaiveUI 默认视觉差异大 | 界面观感变化 | 接受非像素级还原；只调整主色/圆角；聊天区保留现有样式 |
| Vue 深响应式拖慢流式 | 长回答卡顿 | `shallowRef` + 不可变更新；`toRaw` 写 DB；基线复测 |
| 状态拆分引入循环依赖 | store 初始化失败 | 依赖方向：session ← stream；跨 store 用延迟调用；runtime 工厂隔离 |
| `vue-tsc` 与 TS 7 不兼容 | 类型检查失败 | 固定 TS 6；Phase 0 验证 |
| Vite 动态导入 Prism/Mermaid 预构建问题 | 运行时加载失败 | Phase 0 验证；按需配置 `optimizeDeps` |
| 删除功能留下死引用 | 构建/运行报错 | 每阶段 `grep` 旧 import；`vue-tsc` 兜底 |
| 图标提取丢尺寸/颜色 | 图标异常 | 保留 `viewBox`/`currentColor`；逐图标目检 |
| 新 DB/删除全部 bug | 数据异常 | `fake-indexeddb` 单测；手工 smoke |
| 固定中文漏改 | 中英混杂 | 删除 `en.ts`；`grep locale/en/useTranslate`；逐页回归 |
| `v-html` XSS | API Key 泄露 | 仅本地静态 SVG/Prism/KaTeX/Mermaid；Mermaid strict；ESLint 定点豁免 |

## 9. 显式假设

1. 固定中文：保留 `zh.ts` 与 `t()`，删除 `en.ts`、语言切换、`locale` 状态。
2. 接受 NaiveUI 的默认交互与视觉，不追求 1:1 还原；聊天/Markdown/侧栏保留自定义样式。
3. 只支持桌面；不处理窄屏、触摸、移动端键盘。
4. 不保留语音、导入导出、`file://`、旧数据兼容。
5. 本地 Demo 优先，不做 E2E/视觉/性能自动化；核心模块单测足够。
6. 使用全新 `chat-demo-vue` DB；旧数据留在原处，不迁移、不删除。
7. Vite 当前稳定版；Vue 3.5.x；TypeScript 6.x；NaiveUI 当前稳定版。
8. 不新增产品功能，不做视觉重设计。
9. 仓库 `E:\Harness\chat-demo-vue3` 已 `git init`（`master`、尚无提交）；每步一提交，默认不 push；不引入 Conventional Commits 前缀。

## 10. 参考

- Vue 3 官方风格指南：https://vuejs.org/style-guide/
- Vue 3 `<script setup>`：https://vuejs.org/api/sfc-script-setup.html
- Pinia setup stores：https://pinia.vuejs.org/core-concepts/
- Vite 官方文档：https://vite.dev/guide/
- NaiveUI：https://www.naiveui.com/
- `vue-tsc` 与 TypeScript 7 兼容现状：https://github.com/vuejs/language-tools/pull/6123
- Vitest：https://vitest.dev/guide/

## 11. 变更记录

- 2026-11-18 初稿：Vue 3 + TS + Vite + NaiveUI 重构方案（§0–§9 原编号）。
- 2026-11-18 增补：加入 §5 每步工作流（`CHANGELOGS.md` 记录 + 按序号提交 Git）；`CHANGELOGS.md` 与提交规范、步骤编号 `P<n>-<nn>`、失败处理；§6 补 Phase 0/1 具体步骤清单与 `P<n>-99` 门禁步骤；§7 增加流程验收与每步最低检查；原 §5–§9 顺延为 §6–§10。
