/**
 * 把 Markdown 里的地址规范成可打开的链接：
 * 没有协议时补 `https://`，只放行 http / https / mailto，其余或解析失败返回 undefined。
 */
export const sanitizeUrl = (url: string): string | undefined => {
  let candidate = url
  if (candidate && !/^[a-zA-Z]+:\/\//.test(candidate) && !candidate.startsWith('mailto:')) {
    candidate = `https://${candidate}`
  }

  try {
    const parsed = new URL(candidate)
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? parsed.toString() : undefined
  } catch {
    return undefined
  }
}
