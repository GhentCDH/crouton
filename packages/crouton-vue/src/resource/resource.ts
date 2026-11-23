import { ref } from 'vue';

import type { ResourceDefinition } from '@ghentcdh/crouton-core';

import { type PaginatedApiResponse, PaginatedRequestService } from '../utils/paginatedRequestService';
import { type Request } from '../utils/request';
import type { ResourceApiInstance } from './resource.api';

type UiNode = {
  type?: string;
  options?: Record<string, unknown>;
  elements?: UiNode[];
};

const tableDefaults = (formDef: ResourceDefinition) => {
  const ui = formDef.schemas.table.ui as UiNode | undefined;
  const node =
    ui?.type === 'Table'
      ? ui
      : ui?.elements?.find((e) => e.type === 'Table');
  const opts = node?.options ?? {};
  return {
    ...(opts['defaultSortId'] !== undefined && { sort: opts['defaultSortId'] }),
    ...(opts['defaultSortDir'] !== undefined && { sortDir: opts['defaultSortDir'] }),
    ...(opts['pageSize'] !== undefined && { pageSize: opts['pageSize'] }),
  };
};

export class Resource extends PaginatedRequestService {
  data = ref<unknown>(null);

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
      } as Partial<Request>,
      onRequest,
    );

    if (initialLoad) this.reload();
  }

  protected override async loadData(): Promise<PaginatedApiResponse | null> {
    if (!this.formDef) return null;
    return super.loadData();
  }

  protected loadDataRequest(signal: AbortSignal): Promise<PaginatedApiResponse> {
    return this.api.loadData(this.requestData.value, signal) as Promise<PaginatedApiResponse>;
  }

  protected override afterLoadData(data: PaginatedApiResponse): void {
    this.data.value = (data as unknown as { data: unknown })?.data ?? null;
  }

  /**
   * Fetch every row matching the current filter/search/sort, page by page.
   * Returns `null` when a page fails (the api already notified the user).
   * ponytail: sequential client-side loop; add a server-side streaming export if large exports get slow.
   */
  public loadAll = async (pageSize = 500): Promise<unknown[] | null> => {
    const rows: unknown[] = [];
    for (let page = 1; ; page++) {
      const res = (await this.api.loadData({ ...this.requestData.value, page, pageSize })) as
        | { data?: unknown[]; request?: { count?: number } }
        | null;
      if (!res) return null;
      const data = res.data ?? [];
      rows.push(...data);
      if (data.length < pageSize || rows.length >= (res.request?.count ?? 0)) return rows;
    }
  };

  /** Update the active filter strings (wire format: `"field:value:operator"`). */
  public updateFilters = (filter: string[]) => {
    this.updateRequest({ filter });
  };

  /** Update the search query (`q` param used for lookup search). */
  public updateSearch = (q: string) => {
    this.updateRequest({ q: q || undefined });
  };
}
