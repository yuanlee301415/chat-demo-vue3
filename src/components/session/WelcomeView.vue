<script setup lang="ts">
import { useI18n } from '../../i18n'

const { t } = useI18n()
</script>

<template>
  <div class="welcome">
    <h1 class="welcome__title">{{ t('welcomeMessageChat250808') }}</h1>
  </div>
</template>

<style scoped>
.welcome {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.welcome__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}
</style>
