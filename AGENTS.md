# AGENTS.md

> 常驻操作规则：本文件会被 DSH 作为工作区指令加载，每次请求都生效。
> 文档优先级：**AGENTS.md（操作）> `VUE3_REWRITE_PLAN.md`（架构/阶段）> `CHANGELOGS.md`（历史记录）**；三者与代码冲突时以代码和验证结果为准，并先修文档。

## 1. 项目速览

- 把 `deepseek-ai/chat-demo`（React + Rspack）重构为 **Vue 3 + TypeScript + Vite + NaiveUI + Pinia**，只保留桌面端。
- 入口 `src/main.ts` → 外壳 `src/app/App.vue`；状态在 `src/stores/*`；纯逻辑在 `src/services/*`；文案在 `src/i18n/zh.ts`；图标在 `src/assets/icons/*.svg`。

## 2. 每次动手前

1. 读 `CHANGELOGS.md` 最近两条 + `VUE3_REWRITE_PLAN.md` 的 §2（约束）与 §5（工作流）。
2. Vue / Pinia / Vite 任务**必须先加载 `vue-best-practices` skill**（`.agents/skills/vue-best-practices`）。
3. `git log --oneline -3` 与 `git status` 对齐：用户可能刚 amend、切分支或改文件，不要覆盖。

## 3. 步骤工作流（计划 §5 摘要）

1. 开始前：在 `CHANGELOGS.md` 追加「计划与目标」（目标 / 范围 / 不做 / 验收）。
2. 结束前：同一序号补「关键决策始末」「验证记录」「遗留」。
3. 验证通过后提交：`<序号> <目标归纳>`，如 `P2-04 stream store`；不加 `feat:` / `chore:` 前缀。
4. 一步一提交；`CHANGELOGS.md` 随步骤一起提交，不单独提交。
5. 条目里**不写 commit hash**，用 `git log --grep <序号>` 反查。
6. **不改写已提交历史**；修错了用新步骤（如 `P1-03a`）或 `git revert`。
7. 编号 `P<阶段>-<两位序号>`，阶段收尾 `P<n>-99`；序号不复用、不重排；每个 Phase 开始时登记步骤清单。

## 4. 验证基线（每步必跑）

```bash
pnpm type && pnpm lint && pnpm format:check && pnpm test && pnpm build
# 本机 PowerShell 下把 pnpm 换成 pnpm.cmd（执行策略会拦截 pnpm.ps1）
```

- UI 变动追加无头 Chrome 断言（DOM + 控制台 0 报错），截图仅作辅助。
- 运行时验证必须**自己起服务**：dev 用 `8097`、preview 用 `4175`；用户可能占着 `8091` / `4173`，不杀、不复用。
- 验证后停服并确认端口释放（`netstat -ano` 查监听）。
- 端口 / 进程归属先查命令行确认是自己的再 kill。

## 5. 代码约定

- 组件：`<script setup lang="ts">`，显式 props / emits 类型；用 `v-model` 与插槽，不写 React 式回调 API。
- 状态：Pinia **setup store**；写操作只走 action；primitive 用 `shallowRef`。
- 非响应式运行态（Map / Set / AbortController）放 `useRuntimeStore`（`markRaw`），不写模块级可变全局；测试换 `createPinia()` 即重置。
- 纯逻辑（`branches` / `view` / `reply` / `db`）不 import store、不弹 toast；错误通过返回值 / state 暴露。
- UI：NaiveUI 直接用，不写包装组件；Provider 层级 `NConfigProvider → NMessageProvider → NDialogProvider → NLayout`。
- 文案：固定中文，只从 `t()` 取；缺参保留占位符。`.vue` 里除 `AppIcon` 与临时页外禁止 `v-html`。
- 不引计划外依赖；能复用现有模块就不新造。

## 6. 注释规范（约定，不做 ESLint 检查）

**适用范围**：`src/**`，排除测试文件（`*.test.ts` / `*.spec.ts`）；配置文件、脚本与测试不在要求内。注释是团队约定，**不接 ESLint 规则，也不会让 `pnpm lint` 失败**。

- **函数**：`src/**` 里的具名函数（函数声明、`const fn = () => {}`、class 方法）加 JSDoc，首行一句话写职责 / 契约。
  - `@param` 只在含义或约束不直观时写，一旦写就给描述；`@returns` 只在返回含义不直观时写；`@throws` 只在会抛可预期错误时写。
  - **禁止在 JSDoc 里写类型**（`{string}`、`@type`）——TS 是唯一类型来源。
- **字段**：导出 `interface` / `type` 对象字面量的每个字段一行 `/** ... */`，写单位、取值范围或来源；判别式字段可极简但不能省。
  - 可选用 `pnpm docs:fields` 做手工审计（启发式，只查导出类型的单行字段）；它只是自查工具，不是门禁。
- **唯一事实来源**：
  - 优先用类型约束：`Record<IconName, string>`、`Record<ThemePreference, …>`、`Pick<Session, …>`、`TranslationKey`。
  - 其次 `@see <符号 | 文件 | CHANGELOGS 步骤>`。
  - **注释里禁止复制字面量值**（命名空间、端口、上限、版本号），用符号或 `@see` 指向来源。
- 测试文件（`*.test.ts` / `*.spec.ts`）不在要求内：`it(...)` 回调与测试内的 helper 都不要求 JSDoc，写了也不参与审计。
- 反例：逐行翻译实现、给 `computed` getter 写 JSDoc、字段注释写「id 的 id」。

## 7. 唯一事实来源清单

| 事实 | 来源 | 消费方（用类型或 `@see` 指回） |
|---|---|---|
| 应用命名空间 | `src/services/appNamespace.ts` 的 `APP_NAMESPACE` | `chat/db.ts` 的 `DB_NAME`、`stores/settings.ts` 的 `PREFIX` |
| 主题三态 | `stores/settings.ts` 的 `ThemePreference` | `app/useThemeMode.ts`、`App.vue` |
| 图标名 | `components/base/iconNames.ts` 的 `ICON_NAMES` | `ICON_SVGS`、`AppIcon.vue`、`useThemeMode` |
| 文案键 | `i18n/zh.ts` 的 `zh` | `TranslationKey`、`t`、`describe.ts`、`view.ts` |
| 错误分类 | `services/api/types.ts` 的 `ApiErrorKind` | `api/ApiError.ts`、`chat/types.ts` |
| 会话 / 消息模型 | `services/chat/types.ts` 的 `Session` / `Message` / `FileAttachment` | `db.ts` 的 `ChatDB`、`branches.ts`、`view.ts`、`stores/session.ts` |
| 浏览器目标 | `vite.config.ts` 的 `BROWSER_TARGETS` | 派生 `BROWSER_QUERIES` 与 `build.target` |
| 构建版本 | `package.json` 的 `version` | `vite.config.ts` 注入的 `application-version` |

## 8. 环境与坑（Windows / 本机实测）

- **PowerShell 5.1 读 UTF-8 会乱码**：看文件用 `read` 工具，不要用 `Get-Content` 的结果判断编码。
- `pnpm.ps1` 被执行策略拦截：命令一律 `pnpm.cmd`。
- 中文提交信息：先写入临时 UTF-8 文件，再 `git commit -F <file>`。
- 换行：`.gitattributes` 统一 LF；`.prettierignore` 只列 lock 文件、图标 SVG、`*.md`（`dist` / `node_modules` 由 `.gitignore` 兜底，Prettier 3 会读）。
- 端口：旧项目 rspack dev server 曾占 `8090`；Vite 只绑 `127.0.0.1`（默认 `::1` 会让 `http://127.0.0.1` 打不开）。
- CDP：某些 Chrome 实例没有 `Emulation` 域，用 `Page.addScriptToEvaluateOnNewDocument` 注入 `matchMedia` 替身来验证系统主题。
- 文件偶发 `EIO` 锁：重试一次 `edit`；用户可能正在改同一文件，先看 `git status`。

## 9. 不要做

- 不读 / 不删旧 `chat-demo` 的 IndexedDB 与 localStorage；新库固定 `chat-demo-vue`。
- 不支持 `file://`、移动端、语音、导入导出；不写组件测试 / E2E。
- 不把 API Key 写进代码、日志或提交；不提交 `dist/`。
- 不为「像 React」保留包装组件；不 1:1 还原旧界面。

## 10. 文档地图

- `VUE3_REWRITE_PLAN.md`：架构、技术决策、分阶段实施、验收标准。
- `CHANGELOGS.md`：每步的计划 / 决策 / 验证 / 遗留（唯一历史来源）。
- `.agents/skills/vue-best-practices/`：Vue 写法细则（含 references）。
- 本文件：常驻规则；与代码不一致时先改本文件再改代码。
