import { defineClientConfig } from 'vuepress/client';
import ResourceJsonEditorDemo from './components/ResourceJsonEditorDemo.vue';
import AutoSaveFormDemo from './components/AutoSaveFormDemo.vue';

import './styles/app.css';

export default defineClientConfig({
  enhance({ app }) {
    app.component('ResourceJsonEditorDemo', ResourceJsonEditorDemo);
    app.component('AutoSaveFormDemo', AutoSaveFormDemo);
  },
});
