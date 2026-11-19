<script setup lang="ts">
import { NButton, NConfigProvider, NDialogProvider, NLayout, NLayoutContent, NLayoutSider, NMessageProvider, NSpin, darkTheme, dateZhCN, zhCN } from 'naive-ui'
import { computed, onMounted } from 'vue'

import WelcomeView from '../components/session/WelcomeView.vue'
import AppSider from '../components/sider/AppSider.vue'
import CollapsedSider from '../components/sider/CollapsedSider.vue'
import { useI18n } from '../i18n'
import { useSessionStore } from '../stores/session'
import { useSettingsStore } from '../stores/settings'
import { themeOverrides } from './theme'
import { useThemeMode } from './useThemeMode'

const { t } = useI18n()
const { isDark } = useThemeMode()
const session = useSessionStore()
const settings = useSettingsStore()

const theme = computed(() => (isDark.value ? darkTheme : null))
const collapsed = computed(() => settings.siderCollapsed)

onMounted(() => {
  void session.init()
})
</script>

<template>
  <NConfigProvider :theme="theme" :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="themeOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <NLayout class="shell" has-sider>
          <NLayoutSider :collapsed="collapsed" :width="240" :collapsed-width="64" collapse-mode="width" :native-scrollbar="false" :show-trigger="false" bordered>
            <AppSider v-if="!collapsed" />
            <CollapsedSider v-else />
          </NLayoutSider>

          <NLayoutContent class="content">
            <div v-if="!session.ready" class="state" role="status" aria-live="polite">
              <NSpin v-if="!session.initError" size="small" />
              <span>{{ session.initError ? t('sessionListLoadFailed') : t('sessionLoading') }}</span>
              <NButton v-if="session.initError" size="small" @click="session.init()">{{ t('retry') }}</NButton>
            </div>
            <WelcomeView v-else />
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

.content {
  display: flex;
  flex-direction: column;
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
</style>
