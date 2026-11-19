<script setup lang="ts">
import { NButton, NEmpty, NTooltip, useDialog, useMessage } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useThemeMode } from '../../app/useThemeMode'
import { useI18n } from '../../i18n'
import { groupSessions } from '../../services/chat/sessionGroups'
import { useSessionStore } from '../../stores/session'
import { useSettingsStore } from '../../stores/settings'
import SessionItem from './SessionItem.vue'

const { t } = useI18n()
const store = useSessionStore()
const settings = useSettingsStore()
const dialog = useDialog()
const message = useMessage()
const { icon: themeIcon, label: themeLabel, cycle: cycleTheme } = useThemeMode()

/** 分组基准时间；跨午夜或窗口重新聚焦时刷新。 */
const now = ref(Date.now())
let timer: ReturnType<typeof setTimeout> | undefined

/** 刷新基准时间，并安排在下一个零点再刷一次。 */
const refreshNow = () => {
  if (timer !== undefined) {
    clearTimeout(timer)
  }
  const current = Date.now()
  now.value = current
  timer = setTimeout(refreshNow, new Date(current).setHours(24, 0, 0, 0) - current)
}

/** 窗口重新可见时刷新，避免长时间挂起后分组过期。 */
const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    refreshNow()
  }
}

onMounted(() => {
  refreshNow()
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', refreshNow)
})

onBeforeUnmount(() => {
  if (timer !== undefined) {
    clearTimeout(timer)
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', refreshNow)
})

/** 按更新时间分组；入参已由 session store 排序。 */
const groups = computed(() => groupSessions(store.sessions, now.value))

/** 删除前弹确认；失败时提示重试。 */
const confirmDelete = (id: string) => {
  dialog.warning({
    title: t('deleteSessionModalContentTitle'),
    content: t('deleteSessionWithFilesDescription'),
    positiveText: t('delete'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      const removed = await store.remove(id)
      if (!removed) {
        message.error(t('sessionDeleteFailed'))
      }
    },
  })
}
</script>

<template>
  <div class="sider">
    <header class="sider__header">
      <span class="sider__brand">{{ t('appName') }}</span>
      <NTooltip placement="bottom">
        <template #trigger>
          <NButton quaternary circle size="small" :aria-label="t('collapseSiderbarButton')" @click="settings.setSiderCollapsed(true)">
            <template #icon>
              <AppIcon name="panel-left" />
            </template>
          </NButton>
        </template>
        {{ t('collapseSiderbarButton') }}
      </NTooltip>
    </header>

    <div class="sider__new-chat">
      <NButton block secondary @click="store.newChat()">
        <template #icon>
          <AppIcon name="new-chat" />
        </template>
        {{ t('newChat') }}
      </NButton>
    </div>

    <div class="sider__list">
      <NEmpty v-if="store.sessions.length === 0" :description="t('untitledChat')" size="small" />
      <section v-for="group in groups" :key="group.key" class="sider__group">
        <h2 class="sider__group-title">{{ group.label }}</h2>
        <SessionItem v-for="session in group.sessions" :key="session.id" :session="session" :active="session.id === store.activeId" @delete="confirmDelete" />
      </section>
    </div>

    <footer class="sider__footer">
      <NTooltip placement="top">
        <template #trigger>
          <NButton quaternary circle :aria-label="t('avatarMenuSettingsDialogThemeItemLabel')" @click="cycleTheme">
            <template #icon>
              <AppIcon :name="themeIcon" />
            </template>
          </NButton>
        </template>
        {{ t('avatarMenuSettingsDialogThemeItemLabel') }}：{{ themeLabel }}
      </NTooltip>
    </footer>
  </div>
</template>

<style scoped>
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

.sider__brand {
  overflow: hidden;
  font-weight: 600;
  white-space: nowrap;
}

.sider__new-chat {
  padding: 12px;
}

.sider__list {
  flex: 1;
  padding: 0 8px 12px;
  overflow: auto;
}

.sider__group-title {
  margin: 12px 4px 4px;
  color: #8a8f99;
  font-weight: 500;
  font-size: 12px;
}

.sider__footer {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid rgb(128 128 128 / 18%);
}
</style>
