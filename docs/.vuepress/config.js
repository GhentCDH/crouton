import tailwindcss from '@tailwindcss/vite';
import { viteBundler } from '@vuepress/bundler-vite';
import { defineUserConfig } from 'vuepress';
import { hopeTheme } from 'vuepress-theme-hope';


import apiSideBar from '../crouton-api/typedoc_sidebar.json' with { type: 'json' };
import coreSideBar from '../crouton-core/typedoc_sidebar.json' with { type: 'json' };
import vueSideBar from '../crouton-vue/typedoc_sidebar.json' with { type: 'json' };
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
        text: 'Crouton API',
        children: apiSideBar,
      },
      {
        text: 'Crouton Core',
        children: coreSideBar,
      },
      {
        text: 'Crouton Vue',
        children: vueSideBar,
      },
    ],
  }),
});
