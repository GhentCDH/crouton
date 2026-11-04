import { ref } from 'vue';

import type { ResourceDefinition } from '@ghentcdh/crouton-core';

import type { ResourceApiInstance } from './resource.api';
import { PaginatedRequestService } from '../utils/paginatedRequestService';
import { type Request } from '../utils/request';

const tableDefaults = (formDef: ResourceDefinition) => {
  const ui = formDef.schemas.table.ui as any;
  const node =
    ui?.type === 'Table'
      ? ui
      : ui?.elements?.find((e: any) => e.type === 'Table');
  const opts = node?.options ?? {};
  return {
    ...(opts.defaultSortId !== undefined && { sort: opts.defaultSortId }),
    ...(opts.defaultSortDir !== undefined && { sortDir: opts.defaultSortDir }),
    ...(opts.pageSize !== undefined && { pageSize: opts.pageSize }),
  };
};

export class Resource extends PaginatedRequestService {
  data = ref(null);

  constructor(
    private formDef: ResourceDefinition,
    private api: ResourceApiInstance,
    initialRequestParams: Partial<Request>,
    onRequest: (request: Request) => void,
    initialLoad: boolean,
  ) {
    const tableIncludes = formDef.allowedIncludes ?? [];
    super(
      {
        include: tableIncludes,
        ...tableDefaults(formDef),
        ...initialRequestParams,
      },
      onRequest,
    );

    if (initialLoad) this.reload();
  }

  protected override async loadData() {
    if (!this.formDef) return null;
    return super.loadData();
  }

  protected loadDataRequest(signal: AbortSignal) {
    return this.api.loadData(this.requestData.value, signal);
  }

  protected override afterLoadData(data: any) {
    this.data.value = data?.data;
  }

  /** Update the active filter strings (wire format: `"field:value:operator"`). */
  public updateFilters = (filter: string[]) => {
    this.updateRequest({ filter });
  };

  /** Update the search query (`q` param used for lookup search). */
  public updateSearch = (q: string) => {
    this.updateRequest({ q: q || undefined } as any);
  };
}
