import baseConfig from '../../eslint.config.mjs';

const strictRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-unsafe-argument': 'error',
  'no-restricted-syntax': [
    'error',
    {
      selector: 'TSAsExpression > TSAsExpression[typeAnnotation.typeName.name="unknown"]',
      message: 'Forbidden double cast `as unknown as T`. Use a single cast or a type guard.',
    },
  ],
};

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.config.ts', '*.config.mts'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: strictRules,
  },
  {
    // Test files: explicit any still an error, but unsafe-* stays warn
    // (JSON.parse returns any; requiring typed wrappers everywhere is noise)
    files: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  },
];
