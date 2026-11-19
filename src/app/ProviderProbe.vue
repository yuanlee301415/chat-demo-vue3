<script setup lang="ts">
import { NButton, NSpace, useDialog, useMessage } from 'naive-ui'

// P1-03 临时组件：验证 NMessageProvider / NDialogProvider 已接通，Phase 3 删除。
const message = useMessage()
const dialog = useDialog()

/** 触发一次成功提示，验证 `NMessageProvider` 已接入。 */
const notify = () => {
  message.success('NMessageProvider 已接通')
}

/** 弹一次确认框，验证 `NDialogProvider` 已接入。 */
const confirm = () => {
  dialog.warning({
    title: 'NDialogProvider 已接通',
    content: '这段确认框是临时验证，Phase 3 会删除。',
    positiveText: '知道了',
  })
}
</script>

<template>
  <NSpace>
    <NButton data-testid="probe-toast" @click="notify">测试提示</NButton>
    <NButton data-testid="probe-dialog" @click="confirm">测试确认框</NButton>
  </NSpace>
</template>
