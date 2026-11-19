import { createPinia } from 'pinia'

/** 应用唯一的 Pinia 实例；`main.ts` 安装，测试里用 `setActivePinia(createPinia())`。 */
export const pinia = createPinia()
