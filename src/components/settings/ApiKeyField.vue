<script setup lang="ts">
import { NButton, NInput } from 'naive-ui'
import { computed, ref } from 'vue'

import { useI18n } from '../../i18n'
import { useSettingsStore } from '../../stores/settings'
import { useApiKeyForm } from './useApiKeyForm'

const { t } = useI18n()
const settings = useSettingsStore()
const editing = ref(false)
const { apiKey, verifying, error, submit } = useApiKeyForm(() => {
  editing.value = false
})

/** 已有 Key 且不在编辑时只显示掩码。 */
const saved = computed(() => settings.apiKey !== null && !editing.value)

/** 掩码长度与真实 Key 一致。 */
const mask = computed(() => '*'.repeat(settings.apiKey?.length ?? 0))

/** 离开输入框时，已有 Key 且没输入就退回已保存状态。 */
const onBlur = () => {
  if (settings.apiKey !== null && apiKey.value.trim() === '') {
    editing.value = false
  }
}
</script>

<template>
  <div class="cell">
    <div class="label">{{ t('apiKeyStart') }}</div>
    <div class="control">
      <div v-if="saved" class="saved">
        <span class="mask">{{ mask }}</span>
        <NButton quaternary circle size="small" :aria-label="t('apiKeyEdit')" @click="editing = true">
          <template #icon>
            <AppIcon name="edit" />
          </template>
        </NButton>
      </div>
      <div v-else class="input">
        <NInput v-model:value="apiKey" type="password" :placeholder="t('apiKeyPlaceholder')" :input-props="{ autocomplete: 'off', spellcheck: 'false' }" @keydown.enter="submit" @blur="onBlur" />
        <NButton v-if="apiKey.trim() !== ''" size="small" type="primary" :loading="verifying" @click="submit">{{ verifying ? t('apiKeyVerifying') : t('confirm') }}</NButton>
      </div>
      <p v-if="error !== null" class="error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.cell {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}

.label {
  flex-shrink: 0;
  padding-top: 4px;
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
}

.control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
  width: min(420px, 60%);
}

.saved {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mask {
  max-width: 320px;
  overflow: hidden;
  font-family: var(--ds-font-family-code);
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.input {
  display: flex;
  gap: 8px;
  width: 100%;
}

.error {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-state-error-primary);
  text-align: right;
}
</style>
