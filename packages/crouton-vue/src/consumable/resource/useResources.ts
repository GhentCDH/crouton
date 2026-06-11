import { cloneDeep } from 'lodash-es';
import { reactive } from 'vue';

import { customCellRenderers } from '../../table/cells';
import { type FormDefResponse } from '../form-def.schema';
import { resourceApi } from './api';
import { Resource } from './resource';
import { actions, resourceModals } from './resource.actions';
import type { HandleEvent, ResourceApi } from './types';
import { type Request } from '../../utils/request';

export interface UseResourcesProperties {
  initialRequestParams?: Partial<Request>;
  onRequest?: (request: Request) => void;
  handleEvent?: HandleEvent;
  defaultUriParams?: Record<string, string>;
  readonly?: boolean;
}

export const useResources = (
  formDef: FormDefResponse | null | undefined,
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
  }: UseResourcesProperties = {},
): ResourceApi | null => {
  if (!formDef) return null;

  const _formDef = cloneDeep(formDef);
  const api = resourceApi(_formDef, defaultUriParams);
  const resource = new Resource(_formDef, api, initialRequestParams, onRequest);

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
    cellRenderers: customCellRenderers,
    actions: actions(
      api,
      resource,
      _formDef,
      defaultUriParams,
      handleEvent,
      readonly,
    ),
    resourceModal: resourceModals(api, resource, _formDef, handleEvent),
  });
};
