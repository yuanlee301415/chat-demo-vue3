import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  { name: 'app/files-to-lint', files: ['**/*.{ts,mts,tsx,vue}'] },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
  },

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  skipFormatting,

  {
    name: 'app/globals',
    languageOptions: {
      globals: {
        /** 由 `vite.config.ts` 的 define 注入。 */
        __API_ORIGIN__: 'readonly',
      },
    },
  },

  {
    name: 'app/rules',
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'vue/no-v-html': 'error',
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
    },
  },

  {
    // 内联渲染的 HTML 只来自受控的本地资源，逐文件豁免并在源码处注明原因。
    name: 'app/v-html-exemptions',
    files: ['src/components/base/AppIcon.vue', 'src/App.vue'],
    rules: { 'vue/no-v-html': 'off' },
  },
)
