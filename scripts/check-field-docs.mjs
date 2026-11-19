#!/usr/bin/env node
/**
 * 字段注释审计（可选，不是门禁）：检查具名 `interface` / `type` 对象字段是否有紧邻的 `/** ... *\/`。
 *
 * 范围：`src/**`，排除测试文件（`*.test.ts` / `*.spec.ts`）。
 * 启发式边界（已知）：
 * - 只检查「字段单独成行」的写法；单行对象类型无法逐字段注释，单独报出来要求展开。
 * - 泛型、映射类型、索引签名、联合类型里的内联对象可能漏检。
 * 因此它守住「多行导出类型 + 单行字段」的底线，最终仍靠 code review。
 *
 * 用法：`pnpm docs:fields`；有缺口时打印 `文件:行 字段` 并以 1 退出。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), 'src')

/** 递归收集待检查文件；测试文件不参与审计。 */
const collect = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return collect(full)
    if (!/\.ts$/.test(entry.name) || /\.(test|spec)\.ts$/.test(entry.name)) return []
    return [full]
  })

const FIELD = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:\s*\S/
const TYPE_DECLARATION = /^(?:export\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/

/** 统计一行里的花括号净增量。 */
const braceDelta = (line) => {
  let delta = 0
  for (const char of line) {
    if (char === '{') delta += 1
    if (char === '}') delta -= 1
  }
  return delta
}

const missing = []

for (const file of collect(ROOT)) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  let depth = 0

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (depth === 0) {
      const declaration = TYPE_DECLARATION.exec(trimmed)
      if (declaration !== null && line.includes('{')) {
        const delta = braceDelta(line)
        const singleLineObject = delta === 0 && /:\s*\S/.test(line.slice(line.indexOf('{')))
        if (singleLineObject) {
          missing.push(`${path.relative(process.cwd(), file)}:${index + 1}  (单行对象类型需展开：${declaration[1]})`)
        } else {
          depth = delta
        }
      }
      continue
    }

    // 结构体内的注释行跳过。
    if (trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('//')) {
      continue
    }

    const field = FIELD.exec(line)
    if (field !== null) {
      let previous = index - 1
      while (previous >= 0 && lines[previous].trim() === '') previous -= 1
      if (!(lines[previous]?.trim().endsWith('*/') ?? false)) {
        missing.push(`${path.relative(process.cwd(), file)}:${index + 1}  ${field[1]}`)
      }
    }

    depth += braceDelta(line)
    if (depth < 0) depth = 0
  }
}

if (missing.length > 0) {
  console.error(`缺少字段注释 ${missing.length} 处：`)
  for (const item of missing) console.error(`  ${item}`)
  process.exit(1)
}

console.log('所有具名类型的字段都有注释。')
