import './style.css';
import { createApp } from 'vue';

import { CroutonPlugin, loadRuntimeConfig } from '@ghentcdh/crouton-vue';

import App from './App.vue';
import { useApi } from './api.js';
import { router } from './router.js';

loadRuntimeConfig().then(() => {
  const api = useApi();
  const app = createApp(App);
  app.use(CroutonPlugin(api,{
    debugValue: true,
    showErrors: true
  }));
  app.use(router);
  app.mount('#app');
});
