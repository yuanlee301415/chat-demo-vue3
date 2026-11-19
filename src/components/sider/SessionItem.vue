<script setup lang="ts">
import { NButton, NDropdown, NInput } from 'naive-ui'
import { computed, nextTick, ref } from 'vue'

import { useI18n } from '../../i18n'
import type { SessionSummary } from '../../services/chat/types'
import { useSessionStore } from '../../stores/session'

const props = defineProps<{
  /** 列表里的会话摘要 */
  session: SessionSummary
  /** 是否是当前选中的会话 */
  active: boolean
}>()

const emit = defineEmits<{
  /** 请求删除：确认弹窗由父组件负责 */
  delete: [id: string]
}>()

const { t } = useI18n()
const store = useSessionStore()
const editing = ref(false)
const draftTitle = ref('')
const inputRef = ref<InstanceType<typeof NInput> | null>(null)

/** 标题为空时展示占位文案。 */
const displayTitle = computed(() => props.session.title || t('untitledChat'))

/** 进入重命名，并聚焦选中原标题。 */
const startRename = () => {
  draftTitle.value = displayTitle.value
  editing.value = true
  void nextTick(() => inputRef.value?.focus())
}

/** 结束重命名；提交且标题变化时写回。 */
const finishRename = (commit: boolean) => {
  if (!editing.value) {
    return
  }
  editing.value = false
  const title = draftTitle.value.trim()
  if (commit && title !== '' && title !== displayTitle.value) {
    store.rename(props.session.id, title)
  }
}

/** 输入框快捷键：Enter 提交、Esc 取消；输入法组合中不处理。 */
const onKeydown = (event: KeyboardEvent) => {
  if (event.isComposing) {
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    finishRename(true)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    finishRename(false)
  }
}

/** 菜单项：重命名或请求删除。 */
const onMenuSelect = (key: string) => {
  if (key === 'rename') {
    startRename()
  } else {
    emit('delete', props.session.id)
  }
}

const menuOptions = computed(() => [
  { key: 'rename', label: t('sessionItemMenuRenameOption') },
  { key: 'delete', label: t('delete') },
])

/** 选中会话并退出重命名。 */
const select = () => {
  if (!editing.value) {
    store.select(props.session.id)
  }
}
</script>

<template>
  <div class="session-item" :class="{ 'session-item--active': active }" @click="select">
    <NInput v-if="editing" ref="inputRef" v-model:value="draftTitle" size="small" :bordered="false" @blur="finishRename(true)" @keydown="onKeydown" @click.stop />
    <template v-else>
      <span class="session-item__title">{{ displayTitle }}</span>
      <NDropdown :options="menuOptions" trigger="click" placement="bottom-end" @select="onMenuSelect">
        <NButton class="session-item__action" quaternary circle size="tiny" :aria-label="t('more')" @click.stop>
          <template #icon>
            <AppIcon name="ellipsis" />
          </template>
        </NButton>
      </NDropdown>
    </template>
  </div>
</template>

<style scoped>
.session-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.session-item:hover,
.session-item--active {
  background: rgb(128 128 128 / 12%);
}

.session-item--active {
  font-weight: 600;
}

.session-item__title {
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-item__action {
  opacity: 0;
}

.session-item:hover .session-item__action,
.session-item--active .session-item__action {
  opacity: 1;
}
</style>
