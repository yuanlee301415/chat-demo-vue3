import type AppIcon from './components/base/AppIcon.vue'

declare module 'vue' {
  export interface GlobalComponents {
    AppIcon: typeof AppIcon
  }
}

export {}
