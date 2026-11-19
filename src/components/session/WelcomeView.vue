<script setup lang="ts">
import ChatInput from '../chatInput/ChatInput.vue'

import { useI18n } from '../../i18n'

const { t } = useI18n()
</script>

<template>
  <div class="welcome">
    <h1 class="welcome__title">{{ t('welcomeMessageChat250808') }}</h1>
    <ChatInput :session-id="null" />
    <p class="welcome__caveat">{{ t('contentCaveat') }}</p>
  </div>
</template>

<style scoped>
.welcome {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
}

.welcome__title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.welcome__caveat {
  margin: 0;
  color: #8a8f99;
  font-size: 11px;
}
</style>
