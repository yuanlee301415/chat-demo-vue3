import { settleReply } from './reply'
import type { Session } from './types'

/**
 * 把仍处于 `pending` / `streaming` 的回复收尾为「已停止」。
 * 页面关闭或重新加载后，未完成的流没有控制器，只能按停止处理。
 *
 * @see settleReply 单条回复的收尾规则
 */
export const settleInterrupted = (session: Session): Session => {
  const interrupted = session.messages.some((message) => message.role === 'assistant' && (message.status === 'pending' || message.status === 'streaming'))
  if (!interrupted) {
    return session
  }
  return {
    ...session,
    messages: session.messages.map((message) => (message.role === 'assistant' && (message.status === 'pending' || message.status === 'streaming') ? settleReply(message, 'stopped', session.updatedAt) : message)),
  }
}
