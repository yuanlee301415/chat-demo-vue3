/** 生成本地唯一 id：优先 `crypto.randomUUID`，旧环境退化为时间戳 + 随机串。 */
export const createId = (): string => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)
