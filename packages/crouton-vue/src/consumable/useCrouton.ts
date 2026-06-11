import type { AxiosInstance } from 'axios';
import { computed, ref } from 'vue';

import type { ShellMenu } from '@ghentcdh/ui';

import { configureApi, useApi } from '../api';
import { FormDefCache } from './form-def';
import type { SideBarItem } from './sidebar';
import { menu } from './sidebar';

export { menu } from './sidebar';
export type { FormDef, FormSchema, FormSchemas } from './form-def.types';

export const AppConfig = {
  VERSION: 'unknown',
  title: 'Crouton',
};

const sidebar = ref<ShellMenu>([]);
const formDefCache = new FormDefCache();
const config = ref(AppConfig);

export const useCrouton = () => {
  const init = (
    api: AxiosInstance,
    _config: Partial<typeof AppConfig> = {},
  ) => {
    configureApi(api);
    config.value = { ...AppConfig, ..._config };
    return useApi()
      .get('/_app/layout')
      .then((res) => {
        sidebar.value = menu(res.data.sidebar as SideBarItem[]);
      })
      .catch(() => {
        console.error('no layout');
      });
  };

  return {
    init,
    sidebar: sidebar.value,
    version: computed(() => config.value.VERSION),
    title: computed(() => config.value.title),
    getFormDef: (formId: string) => formDefCache.getFormDef(formId),
    getFormByUri: (uri: string) => formDefCache.getFormDefByUri(uri),
  };
};
