import { ref } from 'vue';

import { RequestSchema } from './request';
import { useCrouton } from '../composables/useCrouton';
import { croutonApiCall } from '../resource/resource.api';
import { type RequestData } from '../resource/resource.types';

export abstract class PageService {
  protected requestData = ref<RequestData>();
  public loading = ref(true);
  private abortController: AbortController | null = null;

  constructor(
    initialRequestParams: Partial<Request>,
    private onRequest: (request: Request) => void,
  ) {
    this.requestData.value = RequestSchema.parse({
      ...initialRequestParams,
    });
    this.reload();
  }

  public reload() {
    return this.loadData();
  }

  pageData = ref({ count: 0, pageSize: 1, page: 1, totalPages: 1 });
  sort = ref({ sortColumn: '', sortDirection: '' });
  protected crouton: ReturnType<typeof useCrouton> = useCrouton();

  protected abstract loadDataRequest(signal: AbortSignal): Promise<any>;
  protected abstract afterLoadData(data: any): void;

  private async loadData() {
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
    this.requestData.value = { ...this.requestData.value, ...data };
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

  getFormDef(formId) {
    return this.crouton.getFormDef(formId);
  }

  async apiCall(
    formDefId: string,
    method: string,
    signal: AbortSignal,
    data?: {
      defaultUriParams?: Record<string, string>;
      data?: any;
    },
  ) {
    const formDef = await this.getFormDef(formDefId);
    if (!formDef) throw new Error('no form def');
    const _data = { ...(data?.data ?? {}), ...(data?.query ?? {}) };
    return croutonApiCall(
      formDef,
      method,
      data?.defaultUriParams ?? {},
      _data,
      signal,
    );
  }
}
