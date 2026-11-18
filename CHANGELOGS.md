# CHANGELOGS

> 按 [`VUE3_REWRITE_PLAN.md`](./VUE3_REWRITE_PLAN.md) §5 记录重构的每一步：开始前写「计划与目标」，结束前写「关键决策始末」，验证通过后以「序号 + 目标」提交 Git。
> 条目按执行顺序自上而下追加，最新条目在文件末尾；条目格式见 §5.2。

---

## P0-00 仓库基线

- 状态：已提交（`git log --grep P0-00`）
- 开始：2026-11-18 14:56

**计划与目标（开始前填写）**

- 目标：建立新仓库的首个可用基线——工具链约定文件、项目说明、Vue 3 重构计划与 `CHANGELOGS.md` 记录规范，并形成首次提交。
- 范围：`.editorconfig`、`.gitignore`、`README.md`、`jsconfig.json`、`VUE3_REWRITE_PLAN.md`、`CHANGELOGS.md`。
- 不做：不创建 `package.json`、不安装依赖、不写 `index.html`/`vite.config.ts`/`src/`——全部留给 `P0-01`。
- 验收：
  1. 上述 6 个文件存在、UTF-8 无 BOM、LF 换行，中文可正常阅读。
  2. `git status` 只剩本步骤预期文件；`.idea/`、`node_modules/`、`dist/` 已被 `.gitignore` 覆盖。
  3. `git log --oneline` 恰好 1 条 `P0-00` 提交，提交后工作区干净。
  4. 提交信息为合法 UTF-8，subject 与 `CHANGELOGS.md` 序号一致。

> 开始后发现仓库已存在一条 `chore: 初始化` 提交（14:30，含上述 6 个文件，`CHANGELOGS.md` 为空），目标因此收窄为「按 §5 补齐规范基线并提交」，范围不变；取舍见决策 1。

**关键决策始末（结束前填写）**

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

**计划与目标（开始前填写）**

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

**关键决策始末（结束前填写）**

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
