import axios from 'axios';
import { defineClientConfig } from 'vuepress/client';

import { CroutonPlugin } from '@ghentcdh/crouton-vue';

import AutoSaveFormDemo from './components/AutoSaveFormDemo.vue';
import LayoutDemo from './components/LayoutDemo.vue';
import ResourceJsonEditorDemo from './components/ResourceJsonEditorDemo.vue';
import ResourceJsonValidator from './components/ResourceJsonValidator.vue';

import './styles/app.css';

export default defineClientConfig({
  enhance({ app }) {
    app.use(CroutonPlugin(axios));
    app.component('ResourceJsonEditorDemo', ResourceJsonEditorDemo);
    app.component('AutoSaveFormDemo', AutoSaveFormDemo);
    app.component('ResourceJsonValidator', ResourceJsonValidator);
    app.component('LayoutDemo', LayoutDemo);
  },
});
