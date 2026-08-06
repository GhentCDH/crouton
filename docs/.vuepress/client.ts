import { defineClientConfig } from 'vuepress/client';

import ResourceJsonEditorDemo from './components/ResourceJsonEditorDemo.vue';

import './styles/app.css';

export default defineClientConfig({
  enhance({ app }) {
    app.component('ResourceJsonEditorDemo', ResourceJsonEditorDemo);
  },
});
