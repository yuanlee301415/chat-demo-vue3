<script setup lang="ts">
import { NButton, NConfigProvider, NDialogProvider, NLayout, NLayoutContent, NLayoutSider, NMessageProvider, NSpin, darkTheme, dateZhCN, zhCN } from 'naive-ui'
import { computed, onMounted, watch, watchEffect } from 'vue'

import SessionView from '@/components/session/SessionView.vue'
import WelcomeView from '@/components/session/WelcomeView.vue'
import AppSider from '@/components/sider/AppSider.vue'
import CollapsedSider from '@/components/sider/CollapsedSider.vue'
import SearchPanel from '@/components/search/SearchPanel.vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import { useI18n } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { themeOverrides } from './theme'
import { useThemeMode } from './useThemeMode'

const { t } = useI18n()
const { isDark } = useThemeMode()
const session = useSessionStore()
const settings = useSettingsStore()
const ui = useUiStore()

const theme = computed(() => (isDark.value ? darkTheme : null))
const collapsed = computed(() => settings.siderCollapsed)

/** 当前选中的会话详情；未加载时为空。 */
const activeSession = computed(() => (session.activeId === null ? undefined : session.sessionCache[session.activeId]))

/** 会话详情加载失败标记。 */
const activeError = computed(() => session.activeId !== null && session.sessionLoadErrors[session.activeId] === true)

/** 是否有会话落盘失败；有则顶部提示并提供重试。 */
const saveError = computed(() => Object.values(session.sessionSaveErrors).some(Boolean))

/** 主题 token 与代码高亮样式依赖 body 上的标记，跟着实际生效的深浅色同步。 */
watchEffect(() => {
  const body = document.body
  body.classList.toggle('dark', isDark.value)
  body.classList.toggle('light', !isDark.value)
  if (isDark.value) {
    body.setAttribute('data-ds-dark-theme', 'dark')
  } else {
    body.removeAttribute('data-ds-dark-theme')
  }
  document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
})

/** 搜索结果面板只属于当前会话：切换会话或回到欢迎页时关闭。 */
watch(
  () => session.activeId,
  () => ui.closeSearchPanel(),
)

onMounted(() => {
  void session.init()
})
</script>

<template>
  <NConfigProvider :theme="theme" :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <NLayout class="shell" has-sider>
          <NLayoutSider :collapsed="collapsed" :width="240" :collapsed-width="64" collapse-mode="width" :show-trigger="false" bordered>
            <AppSider v-if="!collapsed" />
            <CollapsedSider v-else />
          </NLayoutSider>

          <NLayoutContent class="content">
            <div v-if="saveError" class="save-error" role="alert">
              <span>{{ t('sessionSaveFailed') }}</span>
              <NButton size="small" @click="session.retrySave()">{{ t('retry') }}</NButton>
            </div>

            <div class="workspace">
              <div class="stage">
                <div v-if="!session.ready" class="state" role="status" aria-live="polite">
                  <NSpin v-if="!session.initError" size="small" />
                  <span>{{ session.initError ? t('sessionListLoadFailed') : t('sessionLoading') }}</span>
                  <NButton v-if="session.initError" size="small" @click="session.init()">{{ t('retry') }}</NButton>
                </div>

                <div v-else-if="activeSession === undefined && session.activeId !== null" class="state" role="status" aria-live="polite">
                  <NSpin v-if="!activeError" size="small" />
                  <span>{{ activeError ? t('sessionLoadFailed') : t('sessionLoading') }}</span>
                  <NButton v-if="activeError" size="small" @click="session.ensureLoaded(session.activeId)">{{ t('retry') }}</NButton>
                </div>

                <SessionView v-else-if="activeSession !== undefined" :session="activeSession" />

                <WelcomeView v-else />
              </div>

              <SearchPanel />
            </div>
          </NLayoutContent>
        </NLayout>

        <SettingsDialog />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.shell {
  height: 100vh;
}

.content {
  display: flex;
  flex-direction: column;
}

.workspace {
  height: 100%;
  overflow: hidden;
  display: flex;
  min-height: 0;
}

.stage {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.state {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.save-error {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  color: #8a4b00;
  font-size: 13px;
  background: #fff4e5;
}
</style>
