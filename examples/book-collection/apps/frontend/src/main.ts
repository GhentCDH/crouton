import './style.css';
import { createApp } from 'vue';

import { CroutonPlugin, loadRuntimeConfig } from '@ghentcdh/crouton-vue';

import App from './App.vue';
import { useApi } from './api.js';
import {customComponents} from './customComponents'
import { router } from './router.js';

loadRuntimeConfig().then(() => {
  const api = useApi();
  const app = createApp(App);
  app.use(CroutonPlugin(api, {
    debugValue: true,
    showErrors: true,
    customComponents,
    router
  }));
  app.use(router);
  app.mount('#app');
});
