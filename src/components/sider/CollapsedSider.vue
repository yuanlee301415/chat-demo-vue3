<script setup lang="ts">
import { NButton, NTooltip } from 'naive-ui'

import { useThemeMode } from '../../app/useThemeMode'
import { useI18n } from '../../i18n'
import { useSessionStore } from '../../stores/session'
import { useSettingsStore } from '../../stores/settings'
import { useUiStore } from '../../stores/ui'

const { t } = useI18n()
const store = useSessionStore()
const settings = useSettingsStore()
const ui = useUiStore()
const { icon: themeIcon, label: themeLabel, cycle: cycleTheme } = useThemeMode()
</script>

<template>
  <div class="collapsed">
    <NTooltip placement="right">
      <template #trigger>
        <NButton quaternary circle :aria-label="t('expandSiderbarButton')" @click="settings.setSiderCollapsed(false)">
          <template #icon>
            <AppIcon name="panel-left" />
          </template>
        </NButton>
      </template>
      {{ t('expandSiderbarButton') }}
    </NTooltip>

    <NTooltip placement="right">
      <template #trigger>
        <NButton quaternary circle :aria-label="t('newChat')" @click="store.newChat()">
          <template #icon>
            <AppIcon name="new-chat" />
          </template>
        </NButton>
      </template>
      {{ t('newChat') }}
    </NTooltip>

    <NTooltip placement="right">
      <template #trigger>
        <NButton quaternary circle :aria-label="t('settings')" @click="ui.openSettings('general')">
          <template #icon>
            <AppIcon name="settings" />
          </template>
        </NButton>
      </template>
      {{ t('settings') }}
    </NTooltip>

    <NTooltip placement="right">
      <template #trigger>
        <NButton quaternary circle :aria-label="t('avatarMenuSettingsDialogThemeItemLabel')" @click="cycleTheme">
          <template #icon>
            <AppIcon :name="themeIcon" />
          </template>
        </NButton>
      </template>
      {{ t('avatarMenuSettingsDialogThemeItemLabel') }}：{{ themeLabel }}
    </NTooltip>
  </div>
</template>

<style scoped>
.collapsed {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 12px 0;
}
</style>
