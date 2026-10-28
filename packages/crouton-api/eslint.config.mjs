import baseConfig from '../../eslint.config.mjs';

const SPEC_FILES = [
  'src/**/*.spec.ts',
  'src/**/*.test.ts',
  'src/**/*.spec-e2e.ts',
  'src/**/test-utils.ts',
];

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
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
          message: 'Double cast (as unknown as X) is forbidden. Use a typed helper or a type guard instead.',
        },
      ],
    },
  },
  {
    // `test/**` is outside the TS project, so only non-type-aware rules apply.
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
          message: 'Double cast (as unknown as X) is forbidden. Use a typed helper or a type guard instead.',
        },
      ],
    },
  },
  {
    // Spec and test-helper files use the same strict rules as production code.
    files: SPEC_FILES,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
          message: 'Double cast (as unknown as X) is forbidden. Use a typed helper or a type guard instead.',
        },
      ],
    },
  },
];
