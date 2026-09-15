import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import-x';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/.turbo/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      'import/no-unresolved': 'off',
      'import/no-cycle': 'error',
    },
  },
];
