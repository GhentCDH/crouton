import { defineClientConfig } from 'vuepress/client';

import ResourceJsonEditorDemo from './components/ResourceJsonEditorDemo.vue';

export default defineClientConfig({
  enhance({ app }) {
    app.component('ResourceJsonEditorDemo', ResourceJsonEditorDemo);
  },
});
