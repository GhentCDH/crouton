import { ref } from 'vue';

import type { ResourceDefinition } from '@ghentcdh/crouton-core';

import type { ResourceApiInstance } from './resource.api';
import type { RequestData } from './resource.types';
import { type Request, RequestSchema } from '../utils/request';

export class Resource {
  private requestData = ref<RequestData>();
  public loading = ref(true);
  private abortController: AbortController | null = null;

  constructor(
    private formDef: ResourceDefinition,
    private api: ResourceApiInstance,
    initialRequestParams: Partial<Request>,
    private onRequest: (request: Request) => void,
    initialLoad: boolean,
  ) {
    this.requestData.value = RequestSchema.parse({
      ...{
        sort: (() => {
          const ui = this.formDef.schemas.table.ui as any;
          const node = ui?.type === 'Table' ? ui : ui?.elements?.find((e: any) => e.type === 'Table');
          return node?.options?.defaultSortId ?? undefined;
        })(),
      },
      ...initialRequestParams,
    });

    if (initialLoad) this.reload();
  }

  public reload() {
    return this.loadData();
  }

  data = ref(null);
  pageData = ref({ count: 0, pageSize: 1, page: 1, totalPages: 1 });
  sort = ref({ sortColumn: '', sortDirection: '' });

  private async loadData() {
    if (!this.formDef) return null;

    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.loading.value = true;

    if (this.requestData.value.page < 1) {
      this.requestData.value.page = 1;
    }

    try {
      const data = await this.api.loadData(this.requestData.value, signal);
      if (signal.aborted) return null;

      const request = data?.request ?? {};
      this.data.value = data?.data;
      this.pageData.value = {
        count: request.count ?? 0,
        pageSize: request.pageSize ?? 1,
        page: request.page ?? 1,
        totalPages: request.totalPages ?? 1,
      };

      this.sort.value = {
        sortColumn: request.sort,
        sortDirection: request.sortDir,
      };
      return data;
    } catch (e) {
      if (signal.aborted) return null;
      throw e;
    } finally {
      if (!signal.aborted) this.loading.value = false;
    }
  }

  private updateRequest = (data: Partial<RequestData>) => {
    const merged = { ...this.requestData.value, ...data };
    this.requestData.value = Object.fromEntries(
      Object.entries(merged).filter(([, v]) => v !== undefined),
    );
    this.onRequest(this.requestData.value);
    this.reload();
  };

  onSort = (id: string) => {
    const sortDir =
      this.requestData.value.sort === id &&
      this.requestData.value.sortDir === 'asc'
        ? 'desc'
        : 'asc';
    this.updateRequest({ sort: id, sortDir });
  };

  updatePage = (page: number) => {
    this.updateRequest({ page });
  };

  updatePageSize = (size: number) => {
    this.updateRequest({ pageSize: size, page: 1 });
  };

  /** Update the active filter strings (wire format: `"field:value:operator"`). */
  public updateFilters = (filter: string[]) => {
    this.updateRequest({ filter });
  };

  /** Update the search query (`q` param used for lookup search). */
  public updateSearch = (q: string) => {
    this.updateRequest({ q: q || undefined } as any);
  };
}
