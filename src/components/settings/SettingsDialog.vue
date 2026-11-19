<script setup lang="ts">
import { NButton, NModal, NRadioButton, NRadioGroup, NSelect, NTabPane, NTabs, useDialog, useMessage } from 'naive-ui'
import { computed, shallowRef } from 'vue'

import type { IconName } from '../../components/base/iconNames'
import { useI18n, type TranslationKey } from '../../i18n'
import { getRegionName, isChineseBrowser, provinces, regionCodes } from '../../services/location'
import { useSessionStore } from '../../stores/session'
import { useSettingsStore, type ThemePreference } from '../../stores/settings'
import { useUiStore, type SettingsSection } from '../../stores/ui'
import ApiKeyField from './ApiKeyField.vue'

const { t } = useI18n()
const ui = useUiStore()
const settings = useSettingsStore()
const session = useSessionStore()
const dialog = useDialog()
const message = useMessage()

/** 主题三选：浅色 / 深色 / 跟随系统。 */
const THEME_OPTIONS: Array<{ value: ThemePreference; label: TranslationKey; icon: IconName }> = [
  { value: 'light', label: 'avatarMenuSettingsDialogThemeSelectLightOption', icon: 'light' },
  { value: 'dark', label: 'avatarMenuSettingsDialogThemeSelectDarkOption', icon: 'dark' },
  { value: 'system', label: 'avatarMenuSettingsDialogThemeSelectSystemOption', icon: 'follow-system' },
]

/** 位置选择方式跟随浏览器语言；界面固定中文，但两者都保留。 */
const chineseLocation = isChineseBrowser()

/** 当前分组，读写 ui store。 */
const section = computed<SettingsSection>({
  get: () => ui.settingsSection,
  set: (value) => ui.setSettingsSection(value),
})

/** 主题偏好，读写 settings store。 */
const theme = computed<ThemePreference>({
  get: () => settings.theme,
  set: (value) => settings.setTheme(value),
})

/** 中国模式下选中的省份。 */
const province = computed(() => (settings.location?.region === 'CN' ? provinces.find((item) => item.code === settings.location?.province) : undefined))

const provinceOptions = provinces.map((item) => ({ value: item.code, label: item.name }))

/** 城市选项随省份变化。 */
const cityOptions = computed(() => province.value?.cities.map((item) => ({ value: item.code, label: item.name })) ?? [])

/** 国家/地区选项按名称排序。 */
const regionOptions = regionCodes.map((code) => ({ value: code, label: getRegionName(code) })).sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))

/** 选择省份：原城市随之清空。 */
const setProvince = (value: string | null) => {
  if (value !== null && value !== province.value?.code) {
    settings.setLocation({ region: 'CN', province: value })
  }
}

/** 选择城市。 */
const setCity = (value: string | null) => {
  if (province.value !== undefined && value !== null) {
    settings.setLocation({ region: 'CN', province: province.value.code, city: value })
  }
}

/** 选择国家/地区。 */
const setRegion = (value: string | null) => {
  if (value !== null) {
    settings.setLocation({ region: value })
  }
}

const deleting = shallowRef(false)

/** 二次确认后删除全部对话；失败提示重试。 */
const confirmDeleteAll = () => {
  dialog.warning({
    title: t('deleteAllSessionsModalTitle'),
    content: t('deleteAllSessionsModalDescription'),
    positiveText: t('deleteAllSessions'),
    negativeText: t('cancel'),
    onPositiveClick: async () => {
      deleting.value = true
      const cleared = await session.deleteAll()
      deleting.value = false
      if (cleared) {
        message.success(t('historyDeleted'))
      } else {
        message.error(t('historyDeleteFailed'))
      }
    },
  })
}
</script>

<template>
  <NModal :show="ui.settingsOpen" preset="card" :title="t('settings')" :style="{ width: '720px', maxWidth: '92vw' }" :bordered="false" @update:show="(show: boolean) => !show && ui.closeSettings()">
    <NTabs v-model:value="section" type="line" animated>
      <NTabPane name="general" :tab="t('settingDialogAsideGeneralOptionLabel')">
        <div class="section">
          <div class="cell">
            <div class="label">{{ t('avatarMenuSettingsDialogThemeItemLabel') }}</div>
            <NRadioGroup v-model:value="theme" name="theme">
              <NRadioButton v-for="option in THEME_OPTIONS" :key="option.value" :value="option.value">
                <span class="option">
                  <AppIcon :name="option.icon" :size="16" />
                  {{ t(option.label) }}
                </span>
              </NRadioButton>
            </NRadioGroup>
          </div>

          <div class="cell">
            <div class="label">{{ t('settingsLocation') }}</div>
            <div v-if="chineseLocation" class="location">
              <NSelect class="province" :value="province?.code ?? null" :options="provinceOptions" :placeholder="t('settingsLocationProvince')" @update:value="setProvince" />
              <NSelect class="city" :value="province === undefined ? null : (settings.location?.city ?? null)" :options="cityOptions" :disabled="province === undefined" :placeholder="t('settingsLocationCity')" @update:value="setCity" />
            </div>
            <NSelect v-else class="region" :value="settings.location?.region ?? null" :options="regionOptions" :placeholder="t('settingsLocationRegion')" @update:value="setRegion" />
          </div>
        </div>
      </NTabPane>

      <NTabPane name="data" :tab="t('settingDialogAsideDataOptionLabel')">
        <div class="section">
          <ApiKeyField />
          <div class="cell">
            <div class="label">{{ t('deleteAllSessions') }}</div>
            <NButton type="error" secondary :disabled="deleting" @click="confirmDeleteAll">{{ t('delete') }}</NButton>
          </div>
        </div>
      </NTabPane>
    </NTabs>
  </NModal>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  min-height: 260px;
}

.cell {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}

.cell:last-child {
  border-bottom: none;
}

.label {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
}

.option {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.location {
  display: flex;
  gap: 8px;
}

.province {
  width: 200px;
}

.city {
  width: 180px;
}

.region {
  width: 240px;
}
</style>
