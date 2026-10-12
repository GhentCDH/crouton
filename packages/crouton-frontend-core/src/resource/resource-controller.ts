import { z } from 'zod';

import type { ResourceApiInstance } from '../api/resource-api';
import { type Store, createStore } from '../store';

const RequestSchema = z.object({
  page: z.coerce.number().int().nonnegative().optional().default(1),
  pageSize: z.coerce.number().int().nonnegative().optional().default(20),
  sort: z.string().optional().default(''),
  sortDir: z.enum(['asc', 'desc']).optional().default('asc'),
  filter: z
    .string()
    .or(z.array(z.string()))
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional()
    .default([]),
  q: z.string().optional(),
});

export type ResourceRequest = z.infer<typeof RequestSchema>;

export type PageData = { count: number; pageSize: number; page: number; totalPages: number };
export type SortData = { sortColumn: string; sortDirection: string };

export type ResourceControllerState = {
  loading: boolean;
  data: unknown[] | null;
  pageData: PageData;
  sort: SortData;
  request: ResourceRequest;
};

export type ResourceController = {
  state: Store<ResourceControllerState>;
  reload: () => Promise<void>;
  onSort: (id: string) => void;
  updatePage: (page: number) => void;
  updatePageSize: (size: number) => void;
  updateFilters: (filter: string[]) => void;
  updateSearch: (q: string) => void;
  abort: () => void;
};

export const createResourceController = (
  api: ResourceApiInstance,
  initialParams: Partial<ResourceRequest> = {},
  onRequest?: (req: ResourceRequest) => void,
  initialLoad = true,
): ResourceController => {
  const initialRequest = RequestSchema.parse(initialParams);
  const state = createStore<ResourceControllerState>({
    loading: true,
    data: null,
    pageData: { count: 0, pageSize: 1, page: 1, totalPages: 1 },
    sort: { sortColumn: '', sortDirection: '' },
    request: initialRequest,
  });

  let abortController: AbortController | null = null;

  const reload = async () => {
    abortController?.abort();
    abortController = new AbortController();
    const { signal } = abortController;
    const req = state.get().request;

    if (req.page < 1) state.update((s) => ({ ...s, request: { ...req, page: 1 } }));

    state.update((s) => ({ ...s, loading: true }));
    try {
      const data = await api.loadData(state.get().request, signal);
      if (signal.aborted) return;
      const r = data?.request ?? {};
      state.update((s) => ({
        ...s,
        data: data?.data ?? null,
        pageData: {
          count: r.count ?? 0,
          pageSize: r.pageSize ?? 1,
          page: r.page ?? 1,
          totalPages: r.totalPages ?? 1,
        },
        sort: { sortColumn: r.sort ?? '', sortDirection: r.sortDir ?? '' },
      }));
    } catch (e) {
      if (!signal.aborted) throw e;
    } finally {
      if (!signal.aborted) state.update((s) => ({ ...s, loading: false }));
    }
  };

  const updateRequest = (patch: Partial<ResourceRequest>) => {
    state.update((s) => ({
      ...s,
      request: Object.fromEntries(
        Object.entries({ ...s.request, ...patch }).filter(([, v]) => v !== undefined),
      ) as ResourceRequest,
    }));
    onRequest?.(state.get().request);
    reload();
  };

  const onSort = (id: string) => {
    const { request } = state.get();
    const sortDir = request.sort === id && request.sortDir === 'asc' ? 'desc' : 'asc';
    updateRequest({ sort: id, sortDir });
  };

  if (initialLoad) reload();

  return {
    state,
    reload,
    onSort,
    updatePage: (page) => updateRequest({ page }),
    updatePageSize: (size) => updateRequest({ pageSize: size, page: 1 }),
    updateFilters: (filter) => updateRequest({ filter }),
    updateSearch: (q) => updateRequest({ q: q || undefined }),
    abort: () => abortController?.abort(),
  };
};
