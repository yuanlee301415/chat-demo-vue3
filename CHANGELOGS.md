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
