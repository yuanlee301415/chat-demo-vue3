# CHANGELOGS

> 按 [`VUE3_REWRITE_PLAN.md`](./VUE3_REWRITE_PLAN.md) §5 记录重构的每一步：开始前写「计划与目标」，结束前写「关键决策始末」，验证通过后以「序号 + 目标」提交 Git。
> 条目按执行顺序自上而下追加，最新条目在文件末尾；条目格式见 §5.2。

---

## P0-00 仓库基线

- 状态：已提交（`git log --grep P0-00`）
- 开始：2026-11-18 14:56

**计划与目标**

- 目标：建立新仓库的首个可用基线——工具链约定文件、项目说明、Vue 3 重构计划与 `CHANGELOGS.md` 记录规范，并形成首次提交。
- 范围：`.editorconfig`、`.gitignore`、`README.md`、`jsconfig.json`、`VUE3_REWRITE_PLAN.md`、`CHANGELOGS.md`。
- 不做：不创建 `package.json`、不安装依赖、不写 `index.html`/`vite.config.ts`/`src/`——全部留给 `P0-01`。
- 验收：
  1. 上述 6 个文件存在、UTF-8 无 BOM、LF 换行，中文可正常阅读。
  2. `git status` 只剩本步骤预期文件；`.idea/`、`node_modules/`、`dist/` 已被 `.gitignore` 覆盖。
  3. `git log --oneline` 恰好 1 条 `P0-00` 提交，提交后工作区干净。
  4. 提交信息为合法 UTF-8，subject 与 `CHANGELOGS.md` 序号一致。

> 开始后发现仓库已存在一条 `chore: 初始化` 提交（14:30，含上述 6 个文件，`CHANGELOGS.md` 为空），目标因此收窄为「按 §5 补齐规范基线并提交」，范围不变；取舍见决策 1。

**关键决策始末**

1. **不重写已有历史**：`6ce4b63 chore: 初始化` 早于本条目，是基线文件的实际入库点。选择在其后追加第一条规范提交（只含文档侧改动），而不是 `git commit --amend` 成单条 `P0-00 ...`。
   - 备选：amend 合并为一条，历史更整齐。
   - 取舍理由：amend 会改写唯一初始提交的 hash，属于对既有历史的破坏性操作；§5.4 明确回滚/整理优先用 `revert`。若要单条干净历史，可后续 `git rebase -i --root` 一次性整理，交由用户决定。
2. **条目里不写 commit hash**：提交前无法预知 hash，`amend` 还会让它失效，写死必然失真。
   - 替代：用 `git log --grep P0-00` 反查；序号与提交一一对应已足够。已同步修订计划 §5.2 的模板与说明。
3. **新增 `.gitattributes`（偏差项，原范围外）**：写入 `* text=auto eol=lf`。
   - 原因：全局 `core.autocrlf=true` 会在 checkout 时把文本转成 CRLF，与 `.editorconfig` 的 `end_of_line = lf` 冲突，`git add` 时已出现 “LF will be replaced by CRLF” 告警；不处理会让后续每步都掺入 EOL 噪音 diff。
   - 备选：本地改 `core.autocrlf=false`——只对当前机器生效、换机器复发，故选择写入仓库级声明。
4. **`jsconfig.json` 保持原样提交**：它的 `@/*` 别名将在 Phase 1 由 `tsconfig.json` + Vite `resolve.alias` 取代，但删除/合并属于 `P1-02`；本步不顺手改。
5. **提交信息不带 `chore:`/`feat:` 前缀**：遵循 §5.4（序号已表达阶段与顺序）。前置的 `chore: 初始化` 保持不动，视为历史事实。

**验证记录**

- 编码与换行：对 6 个基线文件做严格 UTF-8 解码 + BOM/CR 计数 → 全部 `utf8-ok`、无 BOM、`CR=0`（LF）。
- 工作区：`git status --short` 仅 `VUE3_REWRITE_PLAN.md`、`CHANGELOGS.md` 两处预期改动。
- 忽略规则：`git check-ignore -v` 命中 `.idea`、`node_modules`、`dist`、`coverage`。
- 文档可读性：用 `read` 打开计划与本文，中文、标题层级、代码块围栏正常（10 个围栏成对）。
- 提交后复核：`git status` 干净；`git log --oneline` 首条为 `P0-00 ...`；提交信息按 UTF-8 落库。

**遗留**

- `jsconfig.json` 与 `tsconfig.json` 的合并、别名收敛 → `P1-02`。
- 是否把 `chore: 初始化` 与 `P0-00` 整理成单条初始提交 → 待用户决定。

---

## P0-01 Vite + Vue 3 + TS 最小工程

- 状态：已提交（`git log --grep P0-01`）
- 开始：2026-11-18 15:00

**计划与目标**

- 目标：得到可运行的 Vite + Vue 3 + TS 最小工程（无 NaiveUI、无业务代码），`dev`/`build`/`preview`/`type` 四条命令全部跑通，作为 Phase 0 后续验证（NaiveUI、图标、动态导入）的底座。
- 范围：`package.json`、`pnpm-lock.yaml`、`index.html`、`vite.config.ts`、`tsconfig.json`、`src/main.ts`、`src/App.vue`、`src/env.d.ts`。
- 不做：不接 NaiveUI（`P0-02`）；不配 ESLint/Prettier/Vitest（`P1-02`）；不建 `src/app`、`src/components`、`src/stores` 等目录；不做 Pages/CI（`P0-05`、Phase 5）；不实现 `createConfig({ apiOrigin, server })`、`__API_ORIGIN__` 注入、`transformIndexHtml`、`closeBundle`（`P1-01`）。
- 验收：
  1. `pnpm type`（`vue-tsc --noEmit`）0 错误。
  2. `pnpm build` 成功，`dist/` 含 `index.html` 与 `static/` 下 js/css。
  3. `pnpm dev` 在 8090 返回 200，HTML 含 `id="app"`；页面渲染计数器并能响应点击（SFC + TS + scoped CSS 生效）。
  4. `pnpm preview` 在 8090 返回 200，HTML 引用 `./static/` 产物（`base: './'` 生效）。
  5. 仓库只新增预期文件；`node_modules/`、`dist/` 未入库。

> 端口核对：8090 被原 `chat-demo` 的 rspack dev server 占用，实际改用 8091（见决策 5），验收按 8091 执行；其余验收项不变。

**关键决策始末**

1. **版本选型**：实际装到 `vue 3.5.45`、`vite 8.3.8`、`@vitejs/plugin-vue 6.0.11`、`typescript 6.0.3`、`vue-tsc 3.3.14`。
   - TypeScript 停在 6.x：registry 最新是 `7.0.2`，`vue-tsc` 的 peer 只写 `>=5.0.0`，名义上允许；但计划风险表已记录「TS 7 与 vue-tsc 兼容性未验证」，本步不开 spike，按计划固定 6.x。
   - Vite 8 + plugin-vue 6 的 peer（`vite ^5–^8`、`vue ^3.2.25`）与 Node 24.9 均满足。
   - `packageManager` 固定为 `pnpm@12.5.1`，`engines.node` 写 `>=22.12`（Vite 8 的下限）。
2. **手写脚手架，不用 `pnpm create vite`**：官方模板会带示例组件、`@vue/tsconfig` 依赖和演示 CSS，全都要删；手写这 7 个文件更贴近 §4 的目标结构，也少一层间接依赖（`@vue/tsconfig` 的 strict 组合由自己显式声明）。
3. **TS 6 已移除 `baseUrl`**：首次 `pnpm type` 报 `TS5101: Option 'baseUrl' is deprecated`。TS 6 起 `paths` 直接相对 tsconfig 解析，`baseUrl` 冗余；删掉后 0 错误，比加 `ignoreDeprecations` 掩盖问题更干净。
4. **不写 `*.vue` 模块声明**：`vue-tsc` 直接读 SFC 类型；手写 `declare module '*.vue'` 会把组件退化成 `any` 形状、掩盖真实 props 错误。只保留 `src/env.d.ts` 的 `/// <reference types="vite/client" />`。
5. **端口 8090 → 8091（偏差项）**：8090 被原 `chat-demo` 的 `rspack serve`（PID 9192，`0.0.0.0`/`[::]` 通配绑定）占用，Vite 只能退化绑到 `::1`，`127.0.0.1:8090` 实际打到旧项目（首次 smoke 拿到的是旧站首页）。改 8091 并同步修订计划 §1。
6. **显式 `host: '127.0.0.1'`**：Vite 8 默认 `host: 'localhost'`，Node 解析为 `::1`，实测 `http://127.0.0.1:8091` 连不上、`localhost:8091` 才通。写成 IPv4 回环后两者都通，且仍不对局域网暴露。
7. **`dev` 与 `preview` 共用 8091 + `strictPort: true`**：按计划两者不同时运行；严格端口保证被占时直接失败，而不是静默换端口——正是 8090 事故的教训。
8. **`build` 串联类型检查**：`"build": "vue-tsc --noEmit && vite build"`，避免「构建成功但类型已坏」；`pnpm type` 仍可单独跑。

**验证记录**

- `pnpm install`：50 个包，2.1 s，无 peer 冲突告警。
- `pnpm type`：exit 0（修复 `baseUrl` 前为 `TS5101`、exit 2）。
- `pnpm build`：exit 0；`dist/index.html` 0.40 kB、`static/index-*.css` 0.51 kB、`static/index-*.js` 63.63 kB（gzip 25.23 kB），154 ms。
- dev（`http://127.0.0.1:8091`）：`/` 200 且含 `id="app"`、`/@vite/client`、`/src/main.ts`；`/src/main.ts` 200 `text/javascript`；`/src/App.vue` 200 `text/javascript`、4961 B（已编译成带 HMR 上下文的模块）。
- preview（同端口）：`/` 200 且引用 `./static/index-BW0BDWKm.js` 与 `./static/index-CI44TK53.css`；两资源 200，`text/javascript` / `text/css`。
- `dist/index.html` 的资源路径为 `./static/...`，`base: './'` 生效。
- 浏览器（Chromium，1264×805）打开 `http://127.0.0.1:8091/`：渲染出「chat-demo · Vue 3」「等待交互」「点击验证」；点击按钮后状态变为「已点击 1 次」，scoped CSS 生效（`ego_verify` 断言 satisfied）。
- `git status`：仅 6 个预期新文件 + 两处文档改动；`node_modules/`、`dist/` 显示为 ignored（`!!`）。
- 停服后 8091 无残留监听；8090 仍是旧项目进程，未触碰。

**遗留**

- TS `7.0.2` 与 `vue-tsc 3.3.14` 的真实兼容性仍未验证 → 若打算升级，在 `P1-02` 一并评估。
- `src/App.vue` 的原生 `<button>` 是 spike 占位，`P0-02`/`P1-03` 接 NaiveUI 时删除。
- `jsconfig.json` 与 `tsconfig.json` 的 `paths` 重复 → `P1-02` 合并。
- 旧项目 rspack dev server（PID 9192）仍占用 8090，本步未处理。

---

## P0-02 接入 NaiveUI

- 状态：已提交（`git log --grep P0-02`）
- 开始：2026-11-18 15:25

**计划与目标**

- 目标：接入 NaiveUI 并验证三件事——`NConfigProvider` 的固定中文 locale、明暗主题切换、`themeOverrides` 能覆盖主色与圆角；为 Phase 3/4 的控件替换留下已验证的配置底座。
- 范围：`package.json`（新增 `naive-ui`）、`src/app/theme.ts`（新建，`themeOverrides` 草案）、`src/App.vue`（改成 NaiveUI 演示页）。
- 不做：不接 `NMessageProvider`/`NDialogProvider`（`P1-03`）；不搭 `NLayout`/侧栏外壳（`P1-03`）；不提取图标（`P0-03`）；不做暗色静态色板与 `theme.css`（Phase 4）；不引 `vfonts`/自定义字体；不做像素级视觉定稿。
- 验收：
  1. `pnpm type`、`pnpm build` 均 0 错误，产物仍走 `./static/`。
  2. 浅色下主按钮背景等于 `themeOverrides` 的主色（`#4d6bfe` → `rgb(77, 107, 254)`），圆角 8px。
  3. `NEmpty` 默认文案渲染为中文「暂无数据」（证明 `zhCN` 生效）。
  4. 切换 `NSwitch` 后 `NCard` 背景变为 NaiveUI 深色值，再切回浅色；控制台无报错。

**关键决策始末**

1. **`naive-ui 2.45.3`，只用命名导入，不 `app.use(naive)`**：NaiveUI v2 自带 cssr/样式注入，按组件 import 即可；全量 `app.use` 会把整包塞进入口。
   - 代价：每个文件都要显式列 import（后续若要自动导入，可加 `unplugin-vue-components`，本步不引）。
   - 实测入口 JS 从 63.63 kB → 276.07 kB（gzip 25.23 → 85.47 kB）。Demo 单页、无首屏预算，接受；Phase 5 若有需要再做分包。
2. **主题覆盖放 `src/app/theme.ts`**：导出 `PRIMARY_COLOR`（`#4d6bfe`，DeepSeek 蓝）与 `themeOverrides`，只覆盖 `common` 的主色系与圆角（8/6px）。不碰组件级 token，避免 Phase 4 定稿时到处改。
3. **深色主题 = `darkTheme` + 自管页面底色**：NaiveUI 只负责组件内部颜色，页面底色（`#f5f6f8` / `#101014`）由 `.page--dark` 控制；等 `P1-03` 引入 `theme.css`/CSS 变量后再收口，现在不铺开硬编码色值。
4. **本步不接 `NLayout`**：应用外壳属于 `P1-03`。演示页用固定定位的 `.page` 容器验证主题切换，避免过早承担布局高度问题（`NLayout position="absolute"` 需要祖先有高度）。
5. **`NMessageProvider`/`NDialogProvider` 仍留到 `P1-03`**：本步没有 toast/确认框场景，接了也验证不到；`NConfigProvider` 单独接入已足够证明 locale/主题/覆盖可用。
6. **观测口径修正**：`zhCN` 下 `NEmpty` 的默认文案实际是「无数据」，不是验收里凭印象写的「暂无数据」；以实际渲染值为准记录。
7. **同步 `CHANGELOGS.md` 的措辞调整**：工作区里已有一处未提交的用户改动——把 `**计划与目标（开始前填写）**` / `**关键决策始末（结束前填写）**` 改成不带提示的标题。本步沿用新格式，并把该改动一并纳入本提交，避免文档版本与提交脱节。

**验证记录**

- 启动前先清理了 `P0-01` 遗留的 vite 进程（PID 24540 仍占 8091），再重启 dev，避免验到旧进程。
- `pnpm add naive-ui`：`2.45.3`，+21 包，2.5 s。
- `pnpm type`：0 错误。`pnpm build`：2662 modules，`static/index-*.js` 276.07 kB（gzip 85.47 kB）、`static/index-*.css` 0.35 kB。
- 浅色实测：`.n-card` 背景 `rgb(255, 255, 255)`、圆角 `8px`；主按钮背景 `rgb(77, 107, 254)`、圆角 `8px`；`.n-empty__description` 文本「无数据」；`.page` 背景 `rgb(245, 246, 248)`。
- 切换 `NSwitch` 后：`.n-card` 背景 `rgb(24, 24, 28)`、文字 `rgba(255, 255, 255, 0.82)`；`.page` → `rgb(16, 16, 20)`；开关进入 `n-switch--active`。再切回浅色正常。
- 控制台：`Runtime.enable` + `Log.enable` 后重新加载并切换主题，`Runtime.exceptionThrown`、`console.error/warn`、`Log error/warn` 均为 0；另注入 `console.error('probe-error-from-check')` 验证该检测链路确实能捕获，排除假阴性。页面无 `vite-error-overlay`。
- 控制台检查通过后，`pnpm type` / `pnpm build` 在最终代码上复跑仍为 0 错误。

**遗留**

- 入口 bundle 276 kB（gzip 85 kB）：如 Phase 5 有首屏预算，再评估自动导入或分包。
- `themeOverrides` 仅覆盖主色与圆角，Card/Layout/Input 等组件级 token 与 `theme.css` 一起在 Phase 4 定。
- `.page` 的底色是临时硬编码，`P1-03` 换成 `theme.css` 的 CSS 变量。
- `src/App.vue` 仍是演示页，`P1-03` 会替换为应用外壳，届时接入 `NMessageProvider`/`NDialogProvider`。

---

## P0-03 SVG 图标与全局 AppIcon

- 状态：已提交（`git log --grep P0-03`）
- 开始：2026-11-18 15:31

**计划与目标**

- 目标：把原项目 `icons.tsx` 中**仍在用**的图标拆成独立 `.svg`，并提供全局 `AppIcon` 组件与 `IconName` 字面量类型，取代 `icons.tsx` 的 React 组件。
- 范围：`src/assets/icons/*.svg`、`src/components/base/iconNames.ts`、`src/components/base/AppIcon.vue`、`src/components.d.ts`、`src/main.ts`、`src/App.vue`（图标演示网格）。
- 不做：不提取语音（mic/play）、移动端（menu、mobile new-chat 20）、导入导出（upload/download）、语言切换（globe）、自定义 Toast（toast-error）专用图标；不引 `unplugin-icons`/`@iconify`；不做图标分包；不建尺寸 token（由 `size` prop 控制）。
- 验收：
  1. `src/assets/icons/` 的文件数 = `ICON_NAMES` 长度；每个文件都以 `<svg` 开头、`</svg>` 结尾，含 `viewBox`，**无** `width`/`height` 属性，至少一处 `fill="currentColor"`。
  2. `pnpm type`、`pnpm build` 均 0 错误；`IconName` 传错名字时 `vue-tsc` 报错（用一次性错误用例验证后删除）。
  3. 浏览器演示页渲染全部图标，`size` 生效、颜色随 `currentColor`（浅色/深色各看一次）。
  4. 全局注册可用：模板里直接写 `<AppIcon name="…" />` 无需 import（演示页即由全局注册渲染）。

**关键决策始末**

1. **用一次性脚本迁移，不手抄路径**：写了个 Node 脚本按 `export const` + `<svg…</svg>` 切块解析 `icons.tsx`，把 JSX 属性 camelCase 转 kebab（`fillRule` → `fill-rule`）、去掉根 `width`/`height`、保留 `viewBox` 与 `currentColor`。41 个源图标选中 30 个，脚本零失败。
   - 备选：逐个手工复制——每个图标上千字符路径，易错且慢。
   - 脚本本身不进仓库（一次性迁移工具），入库的是提取结果。
2. **按语义命名，不再把尺寸写进名字**：`IconCloseFill14` → `close-fill`、`NewChatIcon` → `new-chat`、`IconRightUpOutline14` → `arrow-up-right`；尺寸交给 `size` prop。
3. **同源多尺寸只留一份**：`IconThinkOutline14/16`、`IconLinkOutline14/16` 是同一图形的两种尺寸，只保留 16 版，14px 场景靠缩放。例外是 `close`（描边叉）与 `close-fill`（实心叉）——不同图形，都保留。
4. **`NewChatIcon` 保留、`IconNewChatOutline20` 丢弃**：前者用于 `Sider`/`CollapsedSider`（保留），后者只出现在 `MobileHeader`（移动端已删）。
5. **共丢弃 11 个**：mic×2、play-media（语音）、menu、new-chat-20（移动端）、upload/download（导入导出）、globe（语言切换）、toast-error（自定义 Toast 已被 `useMessage` 取代）、link-14 与 think-14（尺寸变体）。
6. **`warning.svg` 去掉了原实现的 `clipPath`/`defs`**：源图标用 `<g clip-path="url(#clip0_…)">` 包住三条路径，裁剪矩形正好等于整个 14×14 视口、没有视觉效果；而内联 SVG 在同一页出现多次会产生重复 `id`。只保留三条 `path`。（提取脚本也暴露了 JSX 数字属性 `width={14}`，一并处理。）
7. **`IconName` 由 `as const` 数组推导 + 运行时校验**：`ICON_NAMES` 是唯一清单；`import.meta.glob` 的 key 按名字拼出，文件缺失直接抛错；`DEV` 下额外 warn 未登记的孤儿 SVG。
8. **`v-html` 只渲染本地静态 SVG**：数据来自 `src/assets/icons/*.svg`，不拼接任何用户输入；`P1-02` 接 ESLint 时对该文件定点禁用 `vue/no-v-html`。
9. **修掉 favicon 404（偏差）**：无头验证时报 `Failed to load resource: 404`，定位为浏览器默认请求 `/favicon.ico`。`index.html` 加 `<link rel="icon" href="data:," />` 占位，真实图标留 Phase 5。
10. **接受内联体积**：入口 JS 276.07 → 320.30 kB（gzip 85.47 → 102.91 kB），30 个 SVG 以字符串进包；Demo 无首屏预算，先接受。

**验证记录**

- 提取：源 41 个图标 → 写出 30 个，0 失败。
- SVG 校验：30 个文件全部可被 XML 解析，根节点为 `svg`、含 `viewBox`、无根 `width`/`height`、含 `currentColor`（首轮 `warning.svg` 因 JSX 数字属性解析失败，修正后全绿）。
- `pnpm type`：0 错误。负例 `const bad: IconName = 'not-an-icon'` 报 `TS2322`，确认是 30 个字面量的联合类型（探针文件验证后已删除）。
- `pnpm build`：0 错误；2696 modules，`static/index-*.js` 320.30 kB（gzip 102.91 kB）、`static/index-*.css` 0.88 kB。
- 无头 Chrome（CDP）实测：30 个 `.icon-cell`、34 个 `.app-icon`（30 图标 + 4 个尺寸样例）、30 个唯一名字；无缺 SVG、无空 SVG；首图标 `viewBox="0 0 8 14"`、`fill="currentColor"`，计算值 `fill: rgb(51, 54, 57)` 与单元格文字色一致；尺寸行实测宽度 `14 / 16 / 20 / 24`。
- 切换深色后：图标计算 `fill: rgba(255, 255, 255, 0.82)`、卡片 `rgb(24, 24, 28)`、开关 `n-switch--active`，`currentColor` 生效。
- 控制台：修掉 favicon 404 后，`console.error/warn`、`Runtime.exceptionThrown`、`Log error/warn` 均为 0。

**遗留**

- SVG 以字符串内联进 JS（约 +44 kB 原始、+17 kB gzip）；Phase 5 若在意首屏再评估 sprite/异步。
- `warning` 图标去掉了源实现的裁剪，属判定「裁剪等于整视口、无视觉差异」后的简化，未做像素级比对。
- favicon 目前是 `data:,` 占位，Phase 5 换正式图标。
- ESLint 未接入，`v-html` 的定点豁免与 `vue/no-v-html` 规则留到 `P1-02`。

---

## P0-04 Mermaid / Prism / KaTeX 动态导入 spike

- 状态：已提交（`git log --grep P0-04`）
- 开始：2026-11-18 15:40

**计划与目标**

- 目标：在 Vite 8 下验证三件只在用到时才加载的重型依赖——`mermaid`、`katex`（+ `mhchem` + CSS）、`prismjs`（核心 + 语言包）——能否真正按需加载、构建后是否独立分包、dev 期预构建该 include 哪些，并把结论写进 `vite.config.ts`。
- 范围：`package.json`（新增 `mermaid`/`katex`/`prismjs`/`@types/*`）、`src/spikes/markdown-libs.ts`（临时 spike 模块）、`src/App.vue`（三个触发按钮 + 输出区）、`vite.config.ts`（`optimizeDeps`）。
- 不做：不做 Markdown 解析/AST 渲染/代码块组件（Phase 4）；不做 Prism 全语言表与依赖拓扑（`after([c], cpp)` 那套留到 Phase 4）；不接 `mermaid` 的深浅色与安全配置定稿；不做样式美化。
- 验收：
  1. 首屏加载时不请求 mermaid/katex/prism 语言包；点击对应按钮后才发起请求。
  2. 三种库都能渲染：Mermaid 出 SVG、KaTeX 出公式（含 `\ce{}` 化学式）、Prism 出高亮 HTML。
  3. `pnpm build` 后入口 chunk 不含这三个库，产物里有独立 chunk；记录各 chunk 体积。
  4. `pnpm type` 0 错误，控制台 0 报错；`optimizeDeps` 决策有实测依据（dev 冷启动耗时、按需请求数）。

**关键决策始末**

1. **版本**：`mermaid 12.3.0`、`katex 0.18.11`、`prismjs 1.30.0`，开发依赖 `@types/prismjs 1.26.6`；**不装 `@types/katex`**（katex 0.18 自带类型，装了反而版本对不上）。
2. **KaTeX 降到 `^0.18.11`（有实测依据）**：mermaid 12.3.0 依赖 `katex ^0.18.0`，装 0.19.1 时 pnpm 会同时装 0.19.1 与 0.18.11，构建出**两个** ~259 kB 的 katex chunk。把直接依赖对齐到 `^0.18.11` 后 `pnpm why katex` 只剩一个版本，构建也只剩一个 katex chunk。代价是放弃 0.19 的新特性——本 Demo 不需要。
3. **Prism 核心也改成动态 `import()`**：最初沿用原项目的静态 `import Prism from 'prismjs'`，结果 prism 核心（约 19 kB）被打进入口，入口从 320.30 → 347.99 kB。改为 `import('prismjs')` 并兼容 CJS 默认导出（`module.default ?? module`）后，入口回到 329.29 kB，prism 变成独立 chunk。
4. **语言包依赖全局 Prism（已验证可行）**：`prism-*.min.js` 是副作用脚本，`prism.js` 里有 `_self.Prism = _`，所以只要核心先执行，动态加载的语言包就能挂上；`highlightCode` 里先 `await loadPrism()` 再 `await load()` 保证顺序。
5. **`optimizeDeps.include` 显式登记三库 + 3 个语言包**：实测默认配置同样会被扫描并预构建（行为一致），显式登记的价值是把预构建**固定在启动后一次完成**，避免首次点击时才优化新依赖触发页面 reload（会打断正在进行的会话）。预构建在后台跑：默认 `ready 355 ms`、显式 `463 ms`，都不阻塞打开。
6. **不采用 `exclude: ['mermaid']`**：exclude 会让 mermaid 变成大量原生 ESM 请求；预构建后首次渲染只有 30 个请求（dev）/ 26 个（生产）。
7. **spike 放 `src/spikes/`，Phase 4 删除**：不提前写 `services/markdown/*`——那需要安全配置、语言依赖拓扑、渲染队列，提前落笔会把 Phase 4 的设计定死。`spike-shims.d.ts` 的 `declare module 'prismjs/components/*'` 也随正式实现搬走。
8. **CSS 与字体按需**：`import('katex/dist/katex.min.css')` 在没 import katex 时不会请求；生产首屏 3 个请求里没有 katex 的 CSS，只有渲染公式时才注入 `katex-*.css` 与 2 个字体。

**验证记录**

- `pnpm type`、`pnpm build`：0 错误。
- 构建体积：入口 `index-*.js` 329.29 kB（gzip 106.58）；`mermaid.core` 84.81 kB + 各图类型 chunk（最大 `elk` 1.46 MB，只在实际用到对应图时加载）；`katex` 259.17 kB + `mhchem` 33.22 kB + `katex.css` 29.44 kB；`prism` 18.84 kB + 语言包 1.29 / 0.44 / 6.14 kB。
- katex 去重前：两个 chunk 259.38 kB + 258.91 kB；去重后：一个 259.17 kB。
- dev（清空 `.vite` 冷启动，`optimizeDeps` 生效）：`ready in 463 ms`，预构建在后台完成；首屏 47 个请求中 **0** 个 mermaid/katex/prism 请求；点 Mermaid → 30 个 deps chunk 请求后渲染出 SVG（`viewBox="4 4 625 187"`）；点 KaTeX → 5 个请求（katex、mhchem、css、2 个字体），无 `.katex-error`，渲染出 `2H₂ + O₂ → 2H₂O`；点 Prism → 2 个请求，37 个 `.token`。
- preview（生产产物）：首屏仅 **3** 个请求；点 Mermaid → 26 个 `static/*` chunk；KaTeX → 5 个（含 mhchem 与 2 个字体）；Prism → 2 个；三种输出全部正确。
- 两轮验证（dev + preview）控制台 `error/warn`、异常均为 0。

**遗留**

- mermaid 的图类型共用预构建产物；若要进一步收敛首屏无关体积，可在 Phase 5 评估 `build.rolldownOptions.output.codeSplitting`（`elk` 1.46 MB 只在泳道/架构图时加载）。
- `src/spikes/*` 与 App.vue 的演示区是临时的，Phase 4 落地 `services/markdown/*` 时删除。
- Prism 正式实现要补语言依赖拓扑（如 `cpp` 依赖 `c`）与更多语言，`optimizeDeps.include` 可能需要追加条目。
- katex 跟随 mermaid 停在 0.18.x；等 mermaid 支持 katex 0.19+ 再一起升。
- 构建时 Vite 对 `elk` 等 >500 kB 的 chunk 有告警，属已知预期（按需加载），未调整 `chunkSizeWarningLimit`。

---

## P0-05 产物结构确认

- 状态：已提交（`git log --grep P0-05`）
- 开始：2026-11-18 15:58

**计划与目标**

- 目标：确认生产构建产物在「子路径部署」（GitHub Pages 形态 `/<repo>/`）下能正常加载：`base: './'` 的相对引用、`assetsDir: 'static'`、动态 chunk 与字体/CSS 的路径解析；并把浏览器 target 记录进计划 §3.1。
- 范围：不改业务源码；用临时静态服务器把 `dist` 挂在 `/chat-demo-vue3/` 前缀下，用无头 Chrome 走一遍首屏 + 三个动态库；结论写回计划 §3.1/§6 与本文。
- 不做：不写真实 CI/Pages 工作流（Phase 5）；不改 `base`；不处理 `file://`（已明确不支持）；不引 CDN。
- 验收：
  1. `dist/index.html` 的资源引用全部是相对路径（`./static/...`），不含 `/static` 绝对路径。
  2. 以 `/chat-demo-vue3/` 前缀访问：首屏资源全部 200，页面渲染出图标网格与卡片。
  3. 同一前缀下点 Mermaid / KaTeX / Prism，动态 chunk、字体、CSS 均 200，三种输出正确。
  4. 全程无 4xx/5xx、无加载失败、控制台 0 报错；浏览器 target 写进计划。

**关键决策始末**

1. **用「子路径静态托管」验证，而不是 `vite preview`**：`base: './'` 的风险是相对路径在更深一层目录下解析错位；`vite preview` 默认挂在根路径，测不出这个问题。用临时 Node 静态服务器把 `dist` 挂到 `/chat-demo-vue3/`，等价于 GitHub Pages 的 `/repo/` 形态。
2. **验证过程踩到两个坑（已修，记录以便复用）**：
   - 静态服务器里 `path.join(ROOT, rel)` 在 Windows 上产出反斜杠路径，与正斜杠的 `ROOT` 做 `startsWith` 判断直接 403；改用 `path.resolve` + 分隔符归一化比较。
   - 页面 403 后浏览器拿不到 HTML 里的 `<link rel="icon" href="data:,">`，回退请求 `/favicon.ico` 又产生 404；两个错误同源，修掉第一个后一起消失。
3. **产物形态符合预期的根因**：`dist/index.html` 全部用 `./static/...`；KaTeX 的 CSS 里引用 `./KaTeX_*.woff2`（相对 CSS 所在目录）。因此 `dist` 整体搬到任意子路径都自洽，不需要为每个部署环境改 `base`。
4. **浏览器 target 维持桌面四件套**：`chrome105`/`edge105`/`safari16`/`firefox110`，并在计划 §3.1 补充「不支持移动端」的说明；不加 polyfill、不降级到 ES5。

**验证记录**

- `pnpm build`：0 错误；入口 `static/index-*.js` 329.29 kB、`static/index-*.css` 1.16 kB。
- `dist/index.html`：`<script src="./static/index-*.js">`、`<link href="./static/index-*.css">`，无绝对路径；`dist/**/*.js` 中检索不到 `"/static/`。
- `dist/static/katex-*.css`：字体引用为 `./KaTeX_*.woff2`。
- 子路径实测（`http://127.0.0.1:8093/chat-demo-vue3/` 静态托管 `dist`）：`index.html` 200，`title=DeepSeek Chat Demo`，30 个图标格、`NCard` 存在，`script/link` 解析到 `./static/...`。
- 同一子路径点击三个动态库：Mermaid SVG 出现、KaTeX 渲染出 `→` 且无 `.katex-error`、Prism 37 个 `.token`；共 36 个请求全部 200（含 `/chat-demo-vue3/static/chunk-*.js`），无 4xx/5xx、无 `loadingFailed`、控制台 0 报错。
- 首屏只请求 `/chat-demo-vue3/`、`static/index-*.js`、`static/index-*.css` 三个资源，动态库仍按需。

**遗留**

- 未在真实 Chrome 105 / Safari 16 / Firefox 110 上运行；本次用最新 Chrome 验证行为，低版本语法降级交给 Vite/Rolldown，未逐特性核对。
- 真实 Pages 工作流与「`base` 和仓库名联动」留 Phase 5；当前靠 `base: './'` 规避仓库名耦合。
- 静态服务器脚本是一次性验证工具，只留在临时目录，不入库。

---

## P1-01 根 index.html + vite.config.ts 定稿

- 状态：已提交（`git log --grep P1-01`）
- 开始：2026-11-18 16:17

**计划与目标**

- 目标：把 P0 期间的临时配置升级成可长期维护的形态——`vite.config.ts` 导出 `createConfig({ apiOrigin, server })` 工厂、`define.__API_ORIGIN__`、`transformIndexHtml` 注入版本 meta、`closeBundle` 拷贝 `LICENSE`、CSS 切到 lightningcss，并定稿根 `index.html`。
- 范围：`vite.config.ts`、`index.html`、`src/env.d.ts`、`src/App.vue`（展示 API 源以便验证 define）、`package.json`（脚本与 `lightningcss`/`browserslist`/`@types/node`）、`tsconfig.json` + 新增 `tsconfig.node.json`、`LICENSE`（从原项目复制，MIT）。
- 不做：不写 `services/api/client.ts`（Phase 2 才消费 `__API_ORIGIN__`）；不接 ESLint/Vitest（`P1-02`）；不配 Pages/CI（Phase 5）；不做 `file://`。
- 验收：
  1. `pnpm type` 同时覆盖应用与 `vite.config.ts`，0 错误。
  2. `pnpm build` 产物含 `LICENSE`；`dist/index.html` 含 `application-version` meta（值 = `package.json` 的 version）；入口 JS 中 `__API_ORIGIN__` 被替换为 `https://api.deepseek.com`。
  3. dev 与 build 的 HTML 都注入 version meta；页面渲染出 `API: https://api.deepseek.com`。
  4. CSS 由 lightningcss 处理：构建无告警，页面观感与切换前一致。

**关键决策始末**

1. **`createConfig()` 工厂 + 默认导出**：默认导出 `createConfig()`，同时具名导出工厂，方便测试/代理复用；实测 `createConfig({ apiOrigin: 'http://localhost:8787', server: { port: 9100 } })` 正确改写 `define.__API_ORIGIN__` 与 `server.port`。`defineConfig` 去掉了——有 `UserConfig` 返回类型就够，留着反而成为未使用导入。
2. **版本 meta 用 `transformIndexHtml` 的 tag 注入**：`order: 'pre'` + 返回 tag 数组，不去 HTML 里做字符串替换；版本从 `package.json` 读取，dev/build 都生效。
3. **LICENSE 随产物发布**：`closeBundle` 复制 `LICENSE` 到 `configResolved` 拿到的真实 `outDir`（不硬编码 `dist`，兼容 `--outDir`）。源 LICENSE 从原项目复制（MIT，Copyright (c) 2026 DeepSeek），这是衍生作品应尽的许可义务。
4. **lightningcss + browserslist 目标对齐**：`css.transformer: 'lightningcss'` 与 `browserslistToTargets(['chrome >= 105', 'edge >= 105', 'safari >= 16', 'firefox >= 110'])` 保持与 `build.target` 一致；构建后主 CSS 从 1.16 → 1.26 kB，属输出格式变化，渲染实测一致。
5. **preview 不钉端口（沿用用户 16:07 的改动）**：`preview: { host }`，dev 固定 8091、preview 用默认 4173，两者可同时运行；`package.json` 的 `preview`/`preview:dist` 脚本保留用户的版本，只改 `type` 与 `build`。计划 §1 的端口说明据此更新。
6. **tsconfig 拆两份**：`vite.config.ts` 用了 `node:fs`/`path`，需要 `@types/node`；为避免把 Node 全局类型塞进前端代码，新增 `tsconfig.node.json`（`types: ["node"]`），根 `tsconfig.json` 只 include `src`。`pnpm type` 跑 `vue-tsc` + `tsc -p tsconfig.node.json`，`build` 改为 `pnpm run type && vite build`，避免「配置类型坏了但构建还成功」。
7. **`__API_ORIGIN__` 的可见验证**：App.vue 显示一行「构建期 API 源」，既证明 define 生效，也给 Phase 2 留对照点；该展示随演示页在 Phase 3 删除。

**验证记录**

- `pnpm type`：两个 project 全部 0 错误（`vue-tsc` + `tsc -p tsconfig.node.json`）。
- `pnpm build`：0 错误；`dist/` 顶层为 `index.html` + `LICENSE`（1086 B）+ `static/`；`index.html` 含 `<meta name="application-version" content="0.1.0">`；入口 JS 内联 `https://api.deepseek.com`；主 CSS 1.26 kB（lightningcss 输出）。
- dev 实测（独立进程跑在 8095，避开当时已被占用的 8091）：version meta `0.1.0`、页面显示 `https://api.deepseek.com`、主按钮 `rgb(77, 107, 254)` / 圆角 `8px`、页面底色 `rgb(245, 246, 248)`、30 个图标格，控制台 0 报错。
- preview 实测（独立进程 4175，避开 4173）：同一套断言全部通过，`problems: []`。
- 工厂参数实测：`createConfig({ apiOrigin: 'http://localhost:8787', server: { port: 9100 } })` → `define.__API_ORIGIN__ = "http://localhost:8787"`、`server.port = 9100`、`preview = { host: '127.0.0.1' }`、`base = './'`、`css.transformer = 'lightningcss'`。
- 备注：验证时 8091/4173 已被本会话之外启动的 dev/preview 占用，为不打扰它们，另开 8095/4175 跑独立进程。

**遗留**

- `src/App.vue` 仍是演示页，「构建期 API 源」的展示会在 Phase 3 随页面一起删。
- `tsconfig` 的严格项（如 `exactOptionalPropertyTypes`）与 `jsconfig.json`/`paths` 合并仍留给 `P1-02`。
- preview 不钉端口意味着 `pnpm preview` 可能落到不同端口；CI 需要固定端口时要显式传 `--port`。
- 只复制了本项目 LICENSE，未生成第三方依赖的许可清单（Phase 5 若对外发布再补）。

---

## P1-02 tsconfig / vue-tsc / ESLint / Prettier / Vitest 配置

- 状态：已提交（`git log --grep P1-02`）
- 开始：2026-11-18 16:23

**计划与目标**

- 目标：把质量工具链装好并能跑——`tsconfig`（含 `@/*` 别名、删除 `jsconfig.json`）、ESLint（Vue + TS，禁 `any`）、Prettier（与现有代码风格一致）、Vitest（node 环境 + 一个真实冒烟用例），以及 `pnpm type|lint|format|test` 脚本。
- 范围：`tsconfig.json`、`tsconfig.node.json`、`vite.config.ts`（alias）、`vitest.config.ts`（新增）、`eslint.config.js`（新增）、`.prettierrc.json` + `.prettierignore`（新增）、`src/app/theme.test.ts`（新增冒烟）、`package.json`（脚本与 devDependencies）、删除 `jsconfig.json`。
- 不做：不写 Phase 2 的核心模块单测（`branches`/`reply`/`view`/`db`）；不接组件测试/E2E；不配 CI；暂不引 `eslint-plugin-import` 的循环依赖规则（Phase 5 视需要再加）。
- 验收：
  1. `pnpm type` 0 错误；`pnpm lint` 0 错误；`pnpm format:check` 通过；`pnpm test` 全部通过。
  2. 故意写 `any`、非法 `v-html` 会被 lint 拦住（临时探针验证后删除）。
  3. `jsconfig.json` 已删除，`@/*` 在 `tsconfig` 与 Vite `resolve.alias` 两处一致。
  4. 全仓格式化后重新跑 type/lint/test 仍全绿。

**关键决策始末**

1. **工具版本**：`eslint 10.15`、`eslint-plugin-vue 10.12`、`@vue/eslint-config-typescript 14.9`、`@vue/eslint-config-prettier 10.2`、`prettier 3.10`、`vitest 5.1`。
2. **ESLint 用官方 Vue+TS 组合，不自己拼 flat config**：`defineConfigWithVueTs` + `pluginVue.configs['flat/recommended']` + `vueTsConfigs.recommended` + `skipFormatting`，减少规则互相打架；只在这套之上追加项目规则。
3. **`vue/no-v-html` 逐文件豁免，不全局关闭**：只对 `src/components/base/AppIcon.vue`（本地静态 SVG）与 `src/App.vue`（spike 输出）关闭，源码处注明原因；已用负例验证非豁免文件写 `v-html` 会被拦住。
4. **Prettier 只覆盖代码**：`.prettierignore` 排除 `*.md`（手写换行与表格会被重排）、`src/assets/icons`（超长 path 数据）、`dist`/`node_modules`/`pnpm-lock.yaml`。首次 `--write` 只改动了 `App.vue` 与 `AppIcon.vue`，说明现有风格与配置基本一致。
5. **Vitest 独立配置、不带 Vue 插件**：本阶段只跑 node 环境纯逻辑，`vitest.config.ts` 不引 `@vitejs/plugin-vue`，避免提前引入组件测试能力；`include: ['src/**/*.test.ts']`、`restoreMocks: true`。
6. **`@/*` 三处保持一致**：`tsconfig.paths`、`vite.resolve.alias`、`vitest.resolve.alias`；用临时用例分别验证了 tsc、vitest、vite build 三条链路（探针已删）。
7. **删除 `jsconfig.json`**：`@/*` 已进 tsconfig，两者并存只会让编辑器挑错配置文件；这是 P0-00 遗留的收尾。
8. **`build` 只串 `type`，不串 lint/format**：本地构建不被格式问题阻塞，lint/format 留给 CI 与提交前检查（Phase 5 配 CI 时串起来）。

**验证记录**

- `pnpm type`：0 错误（`vitest.config.ts` 已纳入 `tsconfig.node.json`）。
- `pnpm lint`：0 错误 0 警告（ESLint 10，启用 `--cache`）。
- `pnpm format:check`：`All matched files use Prettier code style!`
- `pnpm test`：`src/app/theme.test.ts` 2 个用例通过；加临时 alias 探针时 3 个用例通过。
- 负例 1：`src/lint-probe-any.ts` 里 `const bad: any = 1` → `@typescript-eslint/no-explicit-any` 报错（exit 1）。
- 负例 2：非豁免组件写 `v-html` → `vue/no-v-html` 报错（exit 1）；删除两个探针后 `pnpm lint` 恢复 0。
- 别名：`@/app/theme` 在 vitest 用例、`tsc`、`vite build`（临时把 App.vue 的 import 换成 alias，构建成功后改回）三条链路均解析成功。
- 格式化后四项检查（type/lint/format:check/test）全部重新跑过，均通过。

**遗留**

- 未引入 `eslint-plugin-import` 的循环依赖规则；Phase 5 若模块变复杂再加。
- 没有 lint-staged/husky 之类的提交钩子（不在计划内）。
- alias 在三处维护（tsconfig / vite / vitest），以后改路径需同步。
- 未接覆盖率工具；Phase 2 写核心单测时再评估是否需要阈值。

---

## P1-03 main.ts + App.vue 外壳

- 状态：已提交（`git log --grep P1-03`）
- 开始：2026-11-18 16:59

**计划与目标**

- 目标：把演示页换成真正的应用外壳——`NConfigProvider` + `NMessageProvider` + `NDialogProvider` + `NLayout`/`NLayoutSider`（可折叠），并确认三个 Provider 都能用；`App.vue` 迁到 `src/app/`，`main.ts` 引入全局样式。
- 范围：`src/app/App.vue`（新建，替代 `src/App.vue`）、`src/app/app.css`（全局样式）、`src/app/ProviderProbe.vue`（临时验证组件）、`src/main.ts`、`eslint.config.js`（v-html 豁免路径同步）、删除 `src/spikes/*`。
- 不做：不实现会话列表/消息区/Markdown（Phase 3/4）；不接 Pinia 与 settings 持久化（Phase 2，主题暂不落盘）；不做设置弹窗（Phase 4）；不保留 P0-03/P0-04 的演示页。
- 验收：
  1. 外壳渲染：左侧 `NLayoutSider` 宽 240，点击收起后 64；主区显示欢迎占位。
  2. `NMessageProvider`：点「测试提示」出现 `.n-message` 且文案正确。
  3. `NDialogProvider`：点「测试确认框」出现 `.n-dialog`，点「知道了」关闭。
  4. 主题切换：切深色后侧栏/内容区背景变化；固定中文生效（占位文案为中文）。
  5. `pnpm type|lint|format:check|test` 全绿，控制台 0 报错；`src/spikes` 已删除且无残留引用。

**关键决策始末**

1. **`App.vue` 迁到 `src/app/`，`main.ts` 引入全局 `app.css`**：符合 §4 目标目录；`app.css` 只负责 `html/body/#app` 的高度与字体基线，配色仍交给 NaiveUI 主题。
2. **Provider 层级**：`NConfigProvider` → `NMessageProvider` → `NDialogProvider` → `NLayout`。`useMessage`/`useDialog` 必须在 Provider 之下调用，所以在 `src/app/ProviderProbe.vue` 里做临时验证组件。
3. **删除 `src/App.vue` 与 `src/spikes/*`（比计划提前）**：外壳替换后 spike 演示已无入口，留着就是死代码；P0-04 的验证结论已入档，Phase 4 会按正式设计重写 `services/markdown/*`。同时把 ESLint 的 `v-html` 豁免路径从 `src/App.vue` 收回到只剩 `AppIcon.vue`。
4. **折叠态单独处理**：首版 64px 放不下「品牌图标 + 折叠按钮 + 两个页脚按钮」，截图里出现裁切；改为折叠时隐藏品牌、header 居中、footer 竖排。实测宽度 69px（64 + 边框）。
5. **主题暂不落盘**：`isDark` 只是组件内 `ref`，settings store 在 Phase 2 才建，不提前引 localStorage 以免和后续 store 冲突。
6. **深色下灰色文字对比度不足**：`.welcome__text` 与占位描述用了硬编码 `#6b7280`，深色主题下偏暗；计划 Phase 4 用 `theme.css` + CSS 变量统一收口，这里不提前铺开。

**验证记录**

- `pnpm build`：0 错误；入口 `index-*.js` 410.10 kB（gzip 129.23 kB，较 P1-01 的 329.47 kB 增大，来自 NLayout/NLayoutSider 与两个 Provider）；CSS 1.22 kB。
- 外壳（dev 独立进程 8097）：`.n-layout-sider` 宽 240；`NEmpty` 文案「会话列表占位（Phase 3 接入）」；主区标题「欢迎页占位」。
- 折叠：点击后宽度 69px（≈64 + 边框），品牌隐藏、按钮居中；折叠态截图确认无裁切。
- 主题：切深色后 sider `rgb(24, 24, 28)`、layout `rgb(16, 16, 20)`；再切回 `rgb(255, 255, 255)`。
- Provider：点「测试提示」出现 `.n-message`，文案「NMessageProvider 已接通」；点「测试确认框」出现 `.n-dialog`（标题「NDialogProvider 已接通」），点「知道了」后消失。
- 控制台：整轮交互 `error/warn`、异常均为 0。
- `pnpm type` / `lint` / `format:check` / `test` 全绿；`src/spikes` 已删除，全仓无 `spikes/`、`spike-shims` 残留引用。

**遗留**

- `ProviderProbe.vue` 与两个测试按钮是临时的，Phase 3 删除。
- 折叠状态与主题都未持久化（Phase 2 的 settings store 负责）。
- 深色下硬编码灰色文字对比度不足，Phase 4 用 CSS 变量收口。
- 侧栏还没有「新对话」按钮与会话列表（Phase 3 接入 `SessionItem`/`Sider`）。
- 入口体积 410 kB：Phase 5 再评估 NaiveUI 组件按需加载。
