import { computed, onScopeDispose, shallowRef, watch } from 'vue'

/** 两次更新的最长间隔 */
const MAX_WAIT = 2000
/** 上次渲染耗时的倍数，过了这段时间才允许下次更新 */
const TIME_CONSUMING_RATE = 2

/**
 * 流式过程中按渲染耗时节流 Markdown 内容的更新：
 * 每次提交后记录本次渲染耗时，按耗时 × TIME_CONSUMING_RATE（不超过 MAX_WAIT）
 * 算出下次允许更新的时间点；新内容在到期时更新，连续输入合并为最新内容。
 * 关闭节流时直接返回最新内容。
 */
export const useThrottleMarkdownRender = (content: () => string, enabled: () => boolean) => {
  // 首次渲染从挂载时开始计时
  const start = shallowRef(performance.now())
  const updatableAt = shallowRef(0)
  const output = shallowRef(content())
  let timer: ReturnType<typeof setTimeout> | undefined

  // flush: 'post' 让测量包含本次 DOM 更新，得到的才是渲染耗时。
  watch(
    output,
    () => {
      const now = performance.now()
      updatableAt.value = now + Math.min(MAX_WAIT, (now - start.value) * TIME_CONSUMING_RATE)
    },
    { flush: 'post' },
  )

  watch(
    [content, enabled],
    ([text, on]) => {
      clearTimeout(timer)
      if (!on) {
        return
      }
      const update = () => {
        start.value = performance.now()
        output.value = text
      }
      const delay = updatableAt.value - performance.now()
      if (delay <= 0) {
        update()
        return
      }
      timer = setTimeout(update, delay)
    },
    { immediate: true },
  )

  onScopeDispose(() => clearTimeout(timer))

  return computed(() => (enabled() ? output.value : content()))
}
