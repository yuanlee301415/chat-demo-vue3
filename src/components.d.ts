import type AppIcon from './components/base/AppIcon.vue'

declare module 'vue' {
  export interface GlobalComponents {
    /** 全局图标组件，见 `components/base/AppIcon.vue` */
    AppIcon: typeof AppIcon
  }
}

export {}
