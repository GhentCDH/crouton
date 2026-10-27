// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../lodash-es-shim.d.ts" />
import { cloneDeep } from 'lodash-es';
import { type Component, type Ref, computed, reactive, shallowRef } from 'vue';

import type { Action, ResourceDefinition, ViewColumnConfig } from '@ghentcdh/crouton-core';
import { enumKey } from '@crouton/i18n';

import { customCellRenderers } from './renderers';
import { Resource } from './resource';
import {
  actions,
  backendAction,
  resourceModals,
  tableActions,
} from './resource.actions';
import { type ResourceApiInstance, resourceApi } from './resource.api';
import type { HandleEvent } from './resource.types';
import { useCrouton } from '../composables/useCrouton';
import { useLanguage } from '../i18n/useLanguage';
import { computedAsync } from '../utils/computedAsync';
import { type Request } from '../utils/request';

const translateEnumValue = (val: any, enumName: string, t: (k: string, f?: string) => string): any => {
  if (!val || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map((v: any) =>
      v && typeof v === 'object' && 'value' in v
        ? { ...v, label: t(enumKey(enumName, String(v.value)), v.label) }
        : v,
    );
  }
  if ('value' in val) return { ...val, label: t(enumKey(enumName, String(val.value)), val.label) };
  return val;
};

/** When the table ui_schema is a wrapper layout, extract the inner Table element. */
const resolveTableUiSchema = (ui: unknown): any => {
  const u = ui as any;
  if (!u || u.type === 'Table') return u;
  return u.elements?.find((e: any) => e.type === 'Table') ?? u;
};

export interface UseResourcesProperties {
  initialRequestParams?: Partial<Request>;
  onRequest?: (request: Request) => void;
  handleEvent?: HandleEvent;
  defaultUriParams?: Record<string, string>;
  readonly?: boolean;
  initialLoad?: boolean;
  inline?: boolean;
}

export interface UseResource {
  id: string;
  operations: Record<string, unknown>;
  uiSchema: any;
  schema: any;
  filterSchema: Record<string, any> | undefined;
  loading: boolean;
  data: any[];
  page: { count: number; pageSize: number; page: number; totalPages: number };
  sort: { sortColumn: string; sortDirection: string };
  filter: any[];
  search: string;
  onSort: (id: string) => void;
  onUpdatePage: (page: number) => void;
  onUpdatePageSize: (size: number) => void;
  onUpdateFilters: (filters: any) => void;
  onUpdateSearch: (search: string) => void;
  cellRenderers: any[];
  actions: any;
  backendAction: (action: Action) => Promise<any>;
  tableActions: any[];
  create: () => void;
  edit: (id: unknown) => void;
  view: (id: unknown) => void;
  delete: (id: unknown) => void;
  closeForm: (result: any) => Promise<void>;
  form: {
    component: Component;
    config: any;
    hideTable: boolean;
    customComponent: Component | null;
  } | null;
  api: ResourceApiInstance;
  reload: () => void;
}

export const useResourcesByUri = (
  uri: string,
  params: UseResourcesProperties = {},
): Ref<UseResource | null | undefined> => {
  const crouton = useCrouton();

  return computedAsync(async () => {
    const config = await crouton.getFormByUri(uri);

    return useResources(config, params);
  });
};
export const useResourcesById = (
  id: string,
  params: UseResourcesProperties = {},
): Ref<UseResource | null> => {
  const crouton = useCrouton();
  const config = computedAsync(() => crouton.getFormDefById(id as string));
  return shallowRef(useResources(config.value, params));
};

export const useResources = (
  formDef: ResourceDefinition | null | undefined,
  {
    initialRequestParams = {},
    onRequest = () => {
      //
    },
    handleEvent = () => {
      //
    },
    defaultUriParams = {},
    readonly = false,
    initialLoad = true,
    inline = false,
  }: UseResourcesProperties = {},
): UseResource | null => {
  if (!formDef) return null;

  const _formDef = cloneDeep(formDef);
  const api = resourceApi(_formDef, defaultUriParams);
  const resource = new Resource(
    _formDef,
    api,
    initialRequestParams,
    onRequest,
    initialLoad,
  );

  const filterSchema = resolveTableUiSchema(_formDef.schemas.table.ui)?.options?.filter
    ?.schema as Record<string, any> | undefined;

  const { translator } = useLanguage();
  const enumCols: ViewColumnConfig[] = ((_formDef.schemas.table as any).columns ?? []).filter(
    (c: ViewColumnConfig) => c.enumName,
  );
  const data =
    enumCols.length === 0
      ? resource.data
      : computed(() =>
          (resource.data.value ?? []).map((row: any) => {
            const out = { ...row };
            for (const col of enumCols) out[col.id] = translateEnumValue(out[col.id], col.enumName!, translator);
            return out;
          }),
        );

  if (readonly) {
    _formDef.operations.delete = null;
    _formDef.operations.update = null;
    _formDef.operations.create = null;
  }

  const resourceModal = resourceModals(
    api,
    resource,
    _formDef,
    handleEvent,
    inline,
  );

  return reactive({
    id: formDef.id,
    operations: _formDef.operations ?? {},
    uiSchema: resolveTableUiSchema(_formDef.schemas.table.ui),
    schema: _formDef.schemas.table.data,
    filterSchema,
    loading: resource.loading,
    data,
    page: resource.pageData,
    sort: resource.sort,
    filter: initialRequestParams.filter
      ? Array.isArray(initialRequestParams.filter)
        ? initialRequestParams.filter
        : [initialRequestParams.filter]
      : [],
    search: (initialRequestParams as any).q ?? '',
    onSort: resource.onSort,
    onUpdatePage: resource.updatePage,
    onUpdatePageSize: resource.updatePageSize,
    onUpdateFilters: resource.updateFilters,
    onUpdateSearch: resource.updateSearch,
    cellRenderers: [...customCellRenderers, ...useCrouton().cellRenderers],
    actions: actions(
      api,
      resource,
      _formDef,
      defaultUriParams,
      handleEvent,
      readonly,
      resourceModal,
    ),
    backendAction: (action: Action) =>
      backendAction(resource, formDef, defaultUriParams, action),
    tableActions: tableActions(resource, _formDef),
    create: resourceModal.create,
    edit: resourceModal.edit,
    view: resourceModal.view,
    delete: resourceModal.delete,
    closeForm: resourceModal.closeForm,
    form: resourceModal.form,
    reload: () => resource.reload(),
    api,
  }) as unknown as UseResource;
};
