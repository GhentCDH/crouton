import { cloneDeep } from 'lodash-es';
import { reactive, shallowRef } from 'vue';

import { customCellRenderers } from './renderers';
import { Resource } from './resource';
import {
  actions,
  backendAction,
  resourceModals,
  tableActions,
} from './resource.actions';
import { resourceApi } from './resource.api';
import type { HandleEvent } from './resource.types';
import { type Action } from '../composables/form-def.schema';
import type { FormDef } from '../composables/form-def.types';
import { useCrouton } from '../composables/useCrouton';
import { computedAsync } from '../utils/computedAsync';
import { type Request } from '../utils/request';
import { computedAsync } from '../utils/computedAsync';

export interface UseResourcesProperties {
  initialRequestParams?: Partial<Request>;
  onRequest?: (request: Request) => void;
  handleEvent?: HandleEvent;
  defaultUriParams?: Record<string, string>;
  readonly?: boolean;
  initialLoad?: boolean;
}

export const useResourcesByUri = (
  uri: string,
  params: UseResourcesProperties = {},
) => {
  const crouton = useCrouton();

  return computedAsync(async () => {
    const config = await crouton.getFormByUri(id);

    return useResources(config, params);
  });
};
export const useResourcesById = (
  id: string,
  params: UseResourcesProperties = {},
) => {
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
  }: UseResourcesProperties = {},
) => {
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
    | Record<string, any>
    | undefined;
  if (readonly) {
    _formDef.operations.delete = null;
    _formDef.operations.update = null;
    _formDef.operations.create = null;
  }

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
    ),
    backendAction: (action: Action) =>
      backendAction(resource, formDef, defaultUriParams, action),
    tableActions: tableActions(resource, _formDef),
    resourceModal: resourceModals(api, resource, _formDef, handleEvent),
    api,
  });
};
