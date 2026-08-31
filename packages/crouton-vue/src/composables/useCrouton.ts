import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import type { AxiosInstance } from 'axios';
import { type App, type ComputedRef, computed, ref } from 'vue';

import type { CellRendererEntry } from '@ghentcdh/crouton-forms-vue';
import {
  CROUTON_EDITABLE_RENDERERS,
  CROUTON_READONLY_RENDERERS,
} from '@ghentcdh/crouton-forms-vue';

import { FormDefCache } from './form-def';
import type { FormDef } from './form-def.types';
import type { SidebarNode } from './sidebar';
import { configureApi, useApi } from './useApi';
import {
  configureLanguage,
  installLanguageHeader,
  onLanguageChange,
  setUiDictionary,
} from './useLanguage';
import {
  customControlRenderers,
  relationReadonlyRenderers,
} from '../resource/renderers';
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
  /**
   * Whether the connected backend has the visual resource builder enabled
   * (backend env var `CROUTON_SCHEMA_EDITOR`, defaults to `false` when unset).
   * Served by the backend via `GET /_app/layout`. Gates dev-only UI such as the
   * resource schema editor. Defaults to `false` here too, so dev-only
   * affordances stay hidden until the backend confirms it's enabled.
   */
  isDev: false,
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

const createCrouton = (
  api: AxiosInstance,
  _config: Partial<typeof AppConfig> = {},
) => {
  configureApi(api);
  const fetchLayout = (overrides: Partial<typeof AppConfig> = {}) =>
    useApi()
      .get('/_app/layout')
      .then((res) => {
        sidebar.value = res.data.sidebar as SidebarNode[];
        // Title from the backend wins unless the consumer passed an explicit override.
        if (res.data.title && !overrides.title) {
          config.value = { ...config.value, title: res.data.title };
        }
        // autoSave from the backend wins unless the consumer passed an explicit override.
        if (
          res.data.autoSave !== undefined &&
          overrides.autoSave === undefined
        ) {
          config.value = { ...config.value, autoSave: res.data.autoSave };
        }
        // isDev always reflects the connected backend — never consumer-overridable.
        if (res.data.isDev !== undefined) {
          config.value = { ...config.value, isDev: res.data.isDev };
        }
        // i18n: configure language system from backend response.
        if (res.data.i18n) {
          configureLanguage({
            languages: res.data.i18n.languages,
            defaultLanguage: res.data.i18n.defaultLanguage,
          });
        }
        // Store ui dictionary for t() lookups.
        if (res.data.ui) {
          setUiDictionary(res.data.ui);
        }
      })
      .catch(() => {
        console.error('no layout');
      });

  let initialized = false;

  const init = () => {
    if (initialized) {
      return;
    }
    initialized = true;
    installLanguageHeader(api);
    config.value = { ...AppConfig, ..._config };

    // When language changes, refresh layout (sidebar, title, ui dict) and
    // re-fetch all cached FormDefs so labels match the new language.
    onLanguageChange(async () => {
      formDefCache.invalidateAll();
      await fetchLayout(_config);
    });

    return fetchLayout(_config);
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
    isDev: computed(() => config.value.isDev),
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
    /**
     * @deprecated use getFormDefById
     * @param formId
     */
    getFormDef: (formId: string) => formDefCache.getFormDefById(formId),
    getFormDefById: (formId: string) => formDefCache.getFormDefById(formId),
    getFormByUri: (uri: string) => formDefCache.getFormDefByUri(uri),
    invalidateFormDef: (formId: string) => formDefCache.invalidate(formId),
    invalidateAllFormDefs: () => formDefCache.invalidateAll(),
    /**
     * Re-fetches `/_app/layout` (sidebar, isDev, autoSave, title) without
     * needing the axios instance again. Used by the dev tools panel after a
     * database sync, since new/changed resources affect the sidebar and any
     * open ResourceTable's cached config.
     */
    refreshLayout: () => fetchLayout(),
  };
};
export type UseCrouton = {
  readonly sidebar: SidebarNode[];
  version: ComputedRef<string>;
  title: ComputedRef<string>;
  autoSave: ComputedRef<boolean>;
  isDev: ComputedRef<boolean>;
  readonly renderers: JsonFormsRendererRegistryEntry[];
  readonly customComponents: CustomComponentEntry[];
  readonly readonlyRenderers: JsonFormsRendererRegistryEntry[];
  readonly cellRenderers: CellRendererEntry[];
  getFormDefById: (formId: string) => Promise<FormDef>;
  getFormByUri: (uri: string) => Promise<FormDef>;
  invalidateFormDef: (formId: string) => void;
  invalidateAllFormDefs: () => void;
  refreshLayout: () => Promise<void>;
};

let _crouton: UseCrouton = null;

export const useCrouton = (): UseCrouton => {
  const initialized = false;

  if (!_crouton) {
    throw new Error('First init the CroutonPlugin');
  }

  (_crouton as any).init();

  return _crouton;
};

export const CroutonPlugin = (
  api: AxiosInstance,
  options: Partial<typeof AppConfig> = {},
) => ({
  install(app: App) {
    // useCrouton(); //.init(api, options);
    app.provide(
      CROUTON_EDITABLE_RENDERERS,
      [customControlRenderers, options.renderers ?? []].flat(),
    );
    app.provide(
      CROUTON_READONLY_RENDERERS,
      [relationReadonlyRenderers, options.readonlyRenderers ?? []].flat(),
    );
    app.provide(
      CROUTON_READONLY_RENDERERS,
      [relationReadonlyRenderers, options.readonlyRenderers ?? []].flat(),
    );
    _crouton = createCrouton(api, options);
  },
});
