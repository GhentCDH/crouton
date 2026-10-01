import { computed, onUnmounted, ref } from 'vue';

import type { CroutonStatus } from './status.types';
import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';

export const useCroutonStatus = () => {
  const status = ref<CroutonStatus | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const backendUp = ref(false);
  const lastChecked = ref<Date | null>(null);
  const autoRefresh = ref(false);
  const actionLoading = ref<string | null>(null);

  const app = useCrouton();
  const isDev = computed(() => app.isDev.value);

  let intervalId: ReturnType<typeof setInterval> | null = null;

  const refresh = async () => {
    loading.value = true;
    error.value = null;
    try {
      const api = useApi();
      const response = await api.get('/crouton/status.json');
      status.value = response.data;
      backendUp.value = true;
      lastChecked.value = new Date();
    } catch (err) {
      backendUp.value = false;
      error.value = (err as Error).message ?? 'Could not reach backend';
    } finally {
      loading.value = false;
    }
  };

  const startAutoRefresh = () => {
    if (intervalId) return;
    intervalId = setInterval(refresh, 10_000);
  };

  const stopAutoRefresh = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  const toggleAutoRefresh = () => {
    autoRefresh.value = !autoRefresh.value;
    if (autoRefresh.value) startAutoRefresh();
    else stopAutoRefresh();
  };

  onUnmounted(stopAutoRefresh);

  const publishResource = async (name: string) => {
    actionLoading.value = name;
    try {
      const api = useApi();
      await api.post(`/_app/resources/${encodeURIComponent(name)}/publish`);
      await refresh();
    } catch (err) {
      console.error('Publish failed', err);
    } finally {
      actionLoading.value = null;
    }
  };

  const addToMenu = async (name: string) => {
    actionLoading.value = name;
    try {
      const api = useApi();
      await api.post(`/_app/resources/${encodeURIComponent(name)}/add-to-menu`);
      await refresh();
      await app.refreshLayout();
    } catch (err) {
      console.error('Add to menu failed', err);
    } finally {
      actionLoading.value = null;
    }
  };

  const removeFromMenu = async (name: string) => {
    actionLoading.value = name;
    try {
      const api = useApi();
      await api.post(`/_app/resources/${encodeURIComponent(name)}/remove-from-menu`);
      await refresh();
      await app.refreshLayout();
    } catch (err) {
      console.error('Remove from menu failed', err);
    } finally {
      actionLoading.value = null;
    }
  };

  return {
    status,
    loading,
    error,
    backendUp,
    lastChecked,
    autoRefresh,
    actionLoading,
    isDev,
    refresh,
    toggleAutoRefresh,
    publishResource,
    addToMenu,
    removeFromMenu,
  };
};
