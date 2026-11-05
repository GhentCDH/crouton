import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...pluginVue.configs['flat/base'],
  {
    // Type-aware linting for the library sources, including `.vue` script blocks.
    // Specs are excluded here: they are not part of tsconfig.lib.json, and the
    // base config already covers them with the non-type-aware rules.
    files: ['src/**/*.ts', 'src/**/*.vue'],
    ignores: ['**/*.spec.ts', '**/*.test.ts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        projectService: {
          allowDefaultProject: ['*.config.ts', '*.config.mts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // .vue script blocks use path aliases that import-x can't resolve at lint time
      'import-x/default': 'off',
      'import-x/named': 'off',
      'import-x/no-unresolved': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
];
