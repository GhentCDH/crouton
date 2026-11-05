import { ref } from 'vue';

import { type Request, RequestSchema } from './request';
import type { RequestData } from '../resource/resource.types';

/**
 * Shared request/pagination state for list endpoints.
 *
 * `Resource` (API-backed tables) and `PageService` (page-specific loaders)
 * keep the same request params, abort handling, page/sort state and update
 * helpers. Only the actual fetch differs, so subclasses implement
 * `loadDataRequest` and optionally `afterLoadData`.
 */
export abstract class PaginatedRequestService {
  protected requestData = ref<RequestData>();
  public loading = ref(true);
  private abortController: AbortController | null = null;

  pageData = ref({ count: 0, pageSize: 1, page: 1, totalPages: 1 });
  sort = ref({ sortColumn: '', sortDirection: '' });

  constructor(
    initialRequestParams: Partial<Request>,
    private onRequest: (request: Request) => void,
  ) {
    this.requestData.value = RequestSchema.parse({
      ...initialRequestParams,
    });
  }

  public reload() {
    return this.loadData();
  }

  protected abstract loadDataRequest(signal: AbortSignal): Promise<any>;

  protected afterLoadData(_data: any): void {
    // Optional hook for subclasses that keep the loaded rows themselves.
  }

  protected async loadData() {
    this.abortController?.abort();
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.loading.value = true;

    if (this.requestData.value.page < 1) {
      this.requestData.value.page = 1;
    }

    try {
      const data = await this.loadDataRequest(signal);

      if (signal.aborted) return null;

      const request = data?.request ?? {};
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
      this.afterLoadData(data);
      return data;
    } catch (e) {
      if (signal.aborted) return null;
      throw e;
    } finally {
      if (!signal.aborted) this.loading.value = false;
    }
  }

  protected updateRequest = (data: Partial<RequestData>) => {
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
}
