<script setup lang="ts">
import { NButton, NConfigProvider, NDialogProvider, NEmpty, NLayout, NLayoutContent, NLayoutSider, NMessageProvider, NTooltip, darkTheme, dateZhCN, zhCN } from 'naive-ui'
import { computed, ref } from 'vue'

import ProviderProbe from './ProviderProbe.vue'
import { themeOverrides } from './theme'
import { useThemeMode } from './useThemeMode'

const { isDark, label: themeLabel, icon: themeIcon, cycle: cycleTheme } = useThemeMode()
const collapsed = ref(false)

const theme = computed(() => (isDark.value ? darkTheme : null))
</script>

<template>
  <NConfigProvider :theme="theme" :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <NLayout class="shell" has-sider>
          <NLayoutSider v-model:collapsed="collapsed" :width="240" :collapsed-width="64" collapse-mode="width" :native-scrollbar="false" bordered>
            <div class="sider">
              <header class="sider__header" :class="{ 'sider__header--collapsed': collapsed }">
                <span v-if="!collapsed" class="sider__brand">
                  <AppIcon name="new-chat" :size="20" />
                  <span>DeepSeek Chat</span>
                </span>
                <NTooltip placement="right">
                  <template #trigger>
                    <NButton quaternary circle size="small" aria-label="切换侧栏" @click="collapsed = !collapsed">
                      <template #icon>
                        <AppIcon name="panel-left" />
                      </template>
                    </NButton>
                  </template>
                  {{ collapsed ? '展开侧栏' : '收起侧栏' }}
                </NTooltip>
              </header>

              <div class="sider__body">
                <NEmpty v-if="!collapsed" description="会话列表占位（Phase 3 接入）" />
              </div>

              <footer class="sider__footer" :class="{ 'sider__footer--collapsed': collapsed }">
                <NTooltip placement="right">
                  <template #trigger>
                    <NButton quaternary circle aria-label="切换主题" @click="cycleTheme">
                      <template #icon>
                        <AppIcon :name="themeIcon" />
                      </template>
                    </NButton>
                  </template>
                  主题：{{ themeLabel }}（点击切换）
                </NTooltip>
                <NTooltip placement="right">
                  <template #trigger>
                    <NButton quaternary circle aria-label="设置">
                      <template #icon>
                        <AppIcon name="settings" />
                      </template>
                    </NButton>
                  </template>
                  设置（Phase 4 接入）
                </NTooltip>
              </footer>
            </div>
          </NLayoutSider>

          <NLayoutContent class="content">
            <div class="welcome">
              <h1 class="welcome__title">欢迎页占位</h1>
              <p class="welcome__text">会话视图、输入框与消息流将在 Phase 3 接入。</p>
              <ProviderProbe />
            </div>
          </NLayoutContent>
        </NLayout>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.shell {
  height: 100vh;
}

.sider {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sider__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 56px;
  padding: 0 12px;
  border-bottom: 1px solid rgb(128 128 128 / 18%);
}

.sider__header--collapsed {
  justify-content: center;
  padding: 0;
}

.sider__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  font-weight: 600;
  white-space: nowrap;
}

.sider__body {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 12px;
  overflow: auto;
}

.sider__footer {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid rgb(128 128 128 / 18%);
}

.sider__footer--collapsed {
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
}

.content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 32px;
  text-align: center;
}

.welcome__title {
  margin: 0;
  font-size: 20px;
}

.welcome__text {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}
</style>
