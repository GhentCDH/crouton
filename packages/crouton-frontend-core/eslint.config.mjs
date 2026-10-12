import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['vue', 'vue/*'], message: 'crouton-frontend-core must not import vue' },
            { group: ['vue-router', 'vue-router/*'], message: 'crouton-frontend-core must not import vue-router' },
            { group: ['vee-validate', 'vee-validate/*'], message: 'crouton-frontend-core must not import vee-validate' },
            { group: ['@ghentcdh/ui', '@ghentcdh/ui/*', '@ghentcdh/crouton-ui-vue', '@ghentcdh/crouton-ui-vue/*'], message: 'crouton-frontend-core must not import UI libraries' },
            { group: ['axios', 'axios/*'], message: 'crouton-frontend-core must not import axios directly — use HttpClient port' },
            { group: ['react', 'react/*', 'react-dom', 'react-dom/*'], message: 'crouton-frontend-core must not import react' },
          ],
        },
      ],
    },
  },
];
