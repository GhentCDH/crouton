import { defineClientConfig } from 'vuepress/client';

import AutoSaveFormDemo from './components/AutoSaveFormDemo.vue';
import ResourceJsonEditorDemo from './components/ResourceJsonEditorDemo.vue';

import './styles/app.css';

export default defineClientConfig({
  enhance({ app }) {
    app.component('ResourceJsonEditorDemo', ResourceJsonEditorDemo);
    app.component('AutoSaveFormDemo', AutoSaveFormDemo);
  },
});
