import { ref } from 'vue';

import { getLabel } from '../composables/useOptions';

type SearchProps = {
  options?: unknown[];
  maxResults?: number;
  debounceMs?: number;
  labelKey: string;
  valueKey: string;
  fetchOptions?: (query: string, signal: AbortSignal) => Promise<unknown[]>;
};

type SearchStrategy = {
  results: ReturnType<typeof ref<unknown[]>>;
  isLoading: ReturnType<typeof ref<boolean>>;
  search(query: string): void;
  clear(): void;
};

function useLocalSearch(props: SearchProps): SearchStrategy {
  const results = ref<unknown[]>([]);
  const isLoading = ref(false);

  function search(query: string) {
    if (!props.options) {
      results.value = [];
      return;
    }
    const q = query.toLowerCase();
    const filtered = q
      ? props.options.filter((item) =>
          String(getLabel(item, props) ?? '').toLowerCase().includes(q),
        )
      : props.options;
    results.value = filtered.slice(0, props.maxResults);
  }

  function clear() {
    results.value = [];
  }

  return { results, isLoading, search, clear };
}

function useRemoteSearch(props: SearchProps): SearchStrategy {
  const results = ref<unknown[]>([]);
  const isLoading = ref(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let fetchController: AbortController | null = null;

  async function doFetch(query: string) {
    if (fetchController) fetchController.abort();
    fetchController = new AbortController();

    isLoading.value = true;
    try {
      const data = await props.fetchOptions?.(query, fetchController.signal);
      results.value = (data || []).slice(0, props.maxResults);
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'AbortError') results.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  function search(query: string) {
    if (debounceTimer) clearTimeout(debounceTimer);
    isLoading.value = true;
    debounceTimer = setTimeout(() => {
      doFetch(query);
    }, props.debounceMs);
  }

  function clear() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (fetchController) fetchController.abort();
    results.value = [];
    isLoading.value = false;
  }

  return { results, isLoading, search, clear };
}

export function useAutoCompleteSearch(props: SearchProps) {
  const strategy = props.fetchOptions
    ? useRemoteSearch(props)
    : useLocalSearch(props);

  function triggerSearch(query: string) {
    strategy.search(query);
  }

  return {
    results: strategy.results,
    isLoading: strategy.isLoading,
    triggerSearch,
    clear: strategy.clear,
  };
}
