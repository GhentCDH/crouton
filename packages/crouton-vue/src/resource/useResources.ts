import { cloneDeep } from 'lodash-es';
import { type Ref, reactive, shallowRef } from 'vue';

import { customCellRenderers } from './renderers';
import { Resource } from './resource';
import {
  type ResourceModals,
  actions,
  backendAction,
  resourceModals,
  tableActions,
} from './resource.actions';
import { type ResourceApiInstance, resourceApi } from './resource.api';
import type { HandleEvent } from './resource.types';
import { type Action } from '../composables/form-def.schema';
import type { FormDef } from '../composables/form-def.types';
import { useCrouton } from '../composables/useCrouton';
import { computedAsync } from '../utils/computedAsync';
import { type Request } from '../utils/request';

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
  closeForm: (result: any) => void;
  form: ResourceModals['form'];
  api: ResourceApiInstance;
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
  const config = computedAsync(() => crouton.getFormDef(id as string));
  return shallowRef(useResources(config.value, params));
};

export const useResources = (
  formDef: FormDef | null | undefined,
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

  const filterSchema = (_formDef.schemas as any).filter?.data as
    Record<string, any> | undefined;
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
    operations: _formDef.operations ?? {},
    uiSchema: _formDef.schemas.table.ui,
    schema: _formDef.schemas.table.data,
    filterSchema,
    loading: resource.loading,
    data: resource.data,
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
    api,
  }) as unknown as UseResource;
};
