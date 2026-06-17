import tailwindcss from '@tailwindcss/vite';
import { viteBundler } from '@vuepress/bundler-vite';
import { defineUserConfig } from 'vuepress';
import { hopeTheme } from 'vuepress-theme-hope';


import guideSideBar from '../guide/typedoc_sidebar.json' with { type: 'json' };
import { fileURLToPath } from 'node:url';

export default defineUserConfig({
  base: process.env.DOCS_BASE ? `${process.env.DOCS_BASE}/` : '/',
  title: 'Crouton',
  description:
    'Configure Resources Once, Use Them Over and Over, Naturally — schema-driven CRUD for NestJS + Vue',
  pagePatterns: ['**/*.md', '!.vuepress', '!**/node_modules'],
  lastUpdated: true,
  bundler: viteBundler({
    viteOptions: {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          '@ghentcdh/crouton-vue': fileURLToPath(
            new URL('../../packages/crouton-vue/src/index.ts', import.meta.url),
          ),
          '@ghentcdh/crouton-forms-vue': fileURLToPath(
            new URL(
              '../../packages/crouton-forms-vue/src/index.ts',
              import.meta.url,
            ),
          ),
          '@ghentcdh/crouton-core': fileURLToPath(
            new URL(
              '../../packages/crouton-core/src/index.ts',
              import.meta.url,
            ),
          ),
        },
      },
    },
    vuePluginOptions: {},
  }),
  theme: hopeTheme({
    docsRepo: 'https://github.com/GhentCDH/crouton',
    docsBranch: 'main',
    docsDir: 'docs',
    lastUpdated: true,
    colorMode: 'light',
    markdown: {
      mermaid: true,
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/GhentCDH/crouton' },
    ],
    plugins: {
      mdEnhance: {
        tabs: true,
        codetabs: true,
        demo: true,
      },
    },
    navbar: [{ text: 'Home', link: '/' }],
    sidebar: [
      {
        text: 'Guide',
        children: guideSideBar,
      },
      // Package reference sections (crouton-api / crouton-core / crouton-vue)
      // are disabled for now — re-enable by restoring the sidebar imports and
      // the copyMd/createMenu calls in tools/doc/vuepress.mjs.
    ],
  }),
});
