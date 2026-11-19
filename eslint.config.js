import pluginVue from 'eslint-plugin-vue'
import jsdoc from 'eslint-plugin-jsdoc'
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
    name: 'app/jsdoc',
    plugins: { jsdoc },
    settings: { jsdoc: { mode: 'typescript' } },
    rules: {
      /** 具名函数必须有 JSDoc；匿名回调与 computed getter 不在范围内。 */
      'jsdoc/require-jsdoc': [
        'error',
        {
          contexts: ['FunctionDeclaration', 'VariableDeclarator > ArrowFunctionExpression', 'VariableDeclarator > FunctionExpression', 'MethodDefinition > FunctionExpression'],
          checkConstructors: false,
        },
      ],
      'jsdoc/require-description': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      /** 类型由 TS 提供，JSDoc 里不重复写。 */
      'jsdoc/no-types': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns-description': 'error',
    },
  },

  {
    // 内联渲染的 HTML 只来自受控的本地资源，逐文件豁免并在源码处注明原因。
    name: 'app/v-html-exemptions',
    files: ['src/components/base/AppIcon.vue'],
    rules: { 'vue/no-v-html': 'off' },
  },
)
