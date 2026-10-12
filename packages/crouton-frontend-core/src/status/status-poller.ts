import type { HttpClient } from '../api/ports';
import { type Store, createStore } from '../store';
import type { CroutonStatus } from './status.types';

export type StatusPollerState = {
  status: CroutonStatus | null;
  loading: boolean;
  error: string | null;
  backendUp: boolean;
  lastChecked: Date | null;
  autoRefresh: boolean;
  actionLoading: string | null;
};

export type StatusPoller = {
  state: Store<StatusPollerState>;
  refresh: () => Promise<void>;
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
  toggleAutoRefresh: () => void;
  publishResource: (name: string) => Promise<void>;
  addToMenu: (name: string, onRefreshLayout?: () => Promise<void>) => Promise<void>;
  removeFromMenu: (name: string, onRefreshLayout?: () => Promise<void>) => Promise<void>;
};

const initial: StatusPollerState = {
  status: null,
  loading: false,
  error: null,
  backendUp: false,
  lastChecked: null,
  autoRefresh: false,
  actionLoading: null,
};

export const createStatusPoller = (http: HttpClient): StatusPoller => {
  const state = createStore<StatusPollerState>({ ...initial });
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const refresh = async () => {
    state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const response = await http.get<CroutonStatus>('/crouton/status.json');
      state.update((s) => ({
        ...s,
        status: response.data,
        backendUp: true,
        lastChecked: new Date(),
      }));
    } catch (err) {
      state.update((s) => ({
        ...s,
        backendUp: false,
        error: (err as Error).message ?? 'Could not reach backend',
      }));
    } finally {
      state.update((s) => ({ ...s, loading: false }));
    }
  };

  const startAutoRefresh = () => {
    if (intervalId) return;
    intervalId = setInterval(refresh, 10_000);
  };

  const stopAutoRefresh = () => {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
  };

  const toggleAutoRefresh = () => {
    state.update((s) => {
      const next = !s.autoRefresh;
      if (next) startAutoRefresh(); else stopAutoRefresh();
      return { ...s, autoRefresh: next };
    });
  };

  const withActionLoading = async (name: string, fn: () => Promise<void>) => {
    state.update((s) => ({ ...s, actionLoading: name }));
    try { await fn(); } catch (err) { console.error(err); }
    finally { state.update((s) => ({ ...s, actionLoading: null })); }
  };

  const publishResource = (name: string) =>
    withActionLoading(name, async () => {
      await http.post(`/_app/resources/${encodeURIComponent(name)}/publish`);
      await refresh();
    });

  const addToMenu = (name: string, onRefreshLayout?: () => Promise<void>) =>
    withActionLoading(name, async () => {
      await http.post(`/_app/resources/${encodeURIComponent(name)}/add-to-menu`);
      await refresh();
      await onRefreshLayout?.();
    });

  const removeFromMenu = (name: string, onRefreshLayout?: () => Promise<void>) =>
    withActionLoading(name, async () => {
      await http.post(`/_app/resources/${encodeURIComponent(name)}/remove-from-menu`);
      await refresh();
      await onRefreshLayout?.();
    });

  return { state, refresh, startAutoRefresh, stopAutoRefresh, toggleAutoRefresh, publishResource, addToMenu, removeFromMenu };
};
