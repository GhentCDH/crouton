import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import type { AxiosInstance } from 'axios';
import { computed, ref } from 'vue';

import type { CellRendererEntry } from '@ghentcdh/crouton-forms-vue';

import { FormDefCache } from './form-def';
import type { SidebarNode } from './sidebar';
import { configureApi, useApi } from './useApi';
import { type CustomComponentEntry } from '../utils/custom-component';

export { isSidebarGroup, isSidebarLeaf, menu } from './sidebar';
export type { SidebarGroup, SidebarLeaf, SidebarNode } from './sidebar';
export type { FormDef, FormSchema, FormSchemas } from './form-def.types';

export const AppConfig = {
  VERSION: 'unknown',
  title: 'Crouton',
  /**
   * Whether form fields are saved automatically on edit.
   * Served by the backend via `GET /_app/layout` and mirrors `autoSave` in
   * `crouton.json`. Defaults to `true`; set to `false` in `crouton.json` to
   * restore explicit Save/Cancel buttons across the whole application.
   */
  autoSave: true,
  /** Extra control renderers merged on top of the built-in crouton renderers in form/edit modals. */
  renderers: [] as JsonFormsRendererRegistryEntry[],
  /** Extra renderers merged on top of the built-in crouton renderers in view (readonly) modals. */
  readonlyRenderers: [] as JsonFormsRendererRegistryEntry[],
  /** Extra cell renderers merged on top of the built-in crouton cell renderers in tables. */
  cellRenderers: [] as CellRendererEntry[],
  customComponents: [] as CustomComponentEntry[],
};

const sidebar = ref<SidebarNode[]>([]);
const formDefCache = new FormDefCache();
const config = ref({ ...AppConfig });

export type UseCrouton = ReturnType<typeof useCrouton>;

export const useCrouton = (): {
  init: (api: AxiosInstance, _config?: Partial<typeof AppConfig>) => Promise<void>;
  readonly sidebar: SidebarNode[];
  version: ReturnType<typeof computed<string>>;
  title: ReturnType<typeof computed<string>>;
  autoSave: ReturnType<typeof computed<boolean>>;
  readonly renderers: JsonFormsRendererRegistryEntry[];
  readonly customComponents: CustomComponentEntry[];
  readonly readonlyRenderers: JsonFormsRendererRegistryEntry[];
  readonly cellRenderers: CellRendererEntry[];
  getFormDef: (formId: string) => ReturnType<FormDefCache['getFormDef']>;
  getFormByUri: (uri: string) => ReturnType<FormDefCache['getFormByUri']>;
} => {
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
        // Title from the backend wins unless the consumer passed an explicit override.
        if (res.data.title && !_config.title) {
          config.value = { ...config.value, title: res.data.title };
        }
        // autoSave from the backend wins unless the consumer passed an explicit override.
        if (res.data.autoSave !== undefined && _config.autoSave === undefined) {
          config.value = { ...config.value, autoSave: res.data.autoSave };
        }
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
    autoSave: computed(() => config.value.autoSave),
    /** Consumer-supplied control renderers, merged on top of built-ins in form/edit modals. */
    get renderers() {
      return config.value.renderers;
    },
    get customComponents() {
      return config.value.customComponents;
    },
    /** Consumer-supplied renderers, merged on top of built-ins in view (readonly) modals. */
    get readonlyRenderers() {
      return config.value.readonlyRenderers;
    },
    /** Consumer-supplied cell renderers, merged on top of built-ins in tables. */
    get cellRenderers() {
      return config.value.cellRenderers;
    },
    getFormDef: (formId: string) => formDefCache.getFormDef(formId),
    getFormByUri: (uri: string) => formDefCache.getFormDefByUri(uri),
  };
};

export function createCrouton(
  api: AxiosInstance,
  options: Partial<typeof AppConfig> = {},
) {
  return {
    install(app) {
      useCrouton().init(api, options);
    },
  };
}
