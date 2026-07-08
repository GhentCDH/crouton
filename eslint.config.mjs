import importPlugin from 'eslint-plugin-import-x';
import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mts', '**/*.mjs'],
    ignores: ['**/eslint.config.mjs'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          depConstraints: [
            // util: only depends on other util — no ui, backend, or cli
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            // backend (NestJS): only util — no Vue, no cli
            {
              sourceTag: 'type:backend',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            // ui (Vue): util + other ui — no NestJS, no cli
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:util', 'type:ui'],
            },
            // cli: util + other cli — no vue, no nest
            {
              sourceTag: 'type:cli',
              onlyDependOnLibsWithTags: ['type:util', 'type:cli'],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.json'],
    rules: {},
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  importPlugin.flatConfigs.recommended,
  {
    ignores: ['**/dist', '**/node_modules', '**/vite.config.*.timestamp*', 'docs/.vuepress/.cache', 'docs/.vuepress/.temp'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      quotes: ['error', 'single'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'import-x/default': 'off',
      'import-x/named': 'off',
      'import-x/no-unresolved': 'off',
      'import-x/newline-after-import': ['error', { count: 1 }],
      'import-x/order': [
        'error',
        {
          named: true,
          alphabetize: {
            order: 'asc',
          },
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: '@ghentcdh/**',
              group: 'external',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          groups: ['external', 'internal', 'index', 'object'],
        },
      ],
    },
  },
];
