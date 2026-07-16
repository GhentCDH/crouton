import './style.css';
import { createApp } from 'vue';
import { getRuntimeConfig, loadRuntimeConfig, useCrouton } from '@ghentcdh/crouton-vue';
import { api } from './api';
import { router } from './router';
import App from './App.vue';
import { customComponents } from './components';

loadRuntimeConfig().then(() => {
  const env = getRuntimeConfig();
  const VERSION =
    env.env === "PRD" ? env.APP_VERSION : `${env.APP_VERSION} (${env.env})`;

  useCrouton()
    .init(api, { VERSION, customComponents: customComponents })
    .then(() => {
      const app = createApp(App);
      app.use(router);
      app.mount("#app");
    });
});
