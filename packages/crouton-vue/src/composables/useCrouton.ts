import type { AxiosInstance } from 'axios';
import { computed, ref } from 'vue';

import { FormDefCache } from './form-def';
import type { SidebarNode } from './sidebar';
import { configureApi, useApi } from './useApi';

export { menu, isSidebarGroup, isSidebarLeaf } from './sidebar';
export type { SidebarLeaf, SidebarGroup, SidebarNode } from './sidebar';
export type { FormDef, FormSchema, FormSchemas } from './form-def.types';

export const AppConfig = {
  VERSION: 'unknown',
  title: 'Crouton',
};

const sidebar = ref<SidebarNode[]>([]);
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
        sidebar.value = res.data.sidebar as SidebarNode[];
      })
      .catch(() => {
        console.error('no layout');
      });
  };

  return {
    init,
    /** Reactive when accessed during render — implemented as a getter so late `init()` calls update consumers. */
    get sidebar() {
      return sidebar.value;
    },
    version: computed(() => config.value.VERSION),
    title: computed(() => config.value.title),
    getFormDef: (formId: string) => formDefCache.getFormDef(formId),
    getFormByUri: (uri: string) => formDefCache.getFormDefByUri(uri),
  };
};
