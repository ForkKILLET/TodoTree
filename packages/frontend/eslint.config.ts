import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import stylistic from '@stylistic/eslint-plugin'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import type { Linter } from 'eslint'

export default [
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    plugins: {
      '@stylistic': stylistic
    },
    rules: {
      semi: 'off',
      quotes: ['error', 'single'],
      'no-trailing-spaces': 'error',
      'brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
      'space-unary-ops': ['error', { words: true, nonwords: true }],

      '@stylistic/semi': ['error', 'never'],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'none' },
        singleline: { delimiter: 'comma' }
      }],

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }]
    }
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      indent: ['error', 2, { SwitchCase: 1 }]
    }
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    rules: {
      indent: 'off',
      'vue/script-indent': ['error', 2, { baseIndent: 0, switchCase: 1 }],
      'vue/html-indent': ['error', 2],
      'vue/multi-word-component-names': 'off',
      'vue/space-unary-ops': ['error', { words: true, nonwords: true }],
    }
  }
] satisfies Linter.Config[]
