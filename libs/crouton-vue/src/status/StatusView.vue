<template>
  <div class="max-w-5xl mx-auto p-6 space-y-6">
    <!-- Backend down: full-width error card, rest of page hidden -->
    <div
      v-if="!backendUp && !loading"
      class="rounded-lg border border-error/40 bg-error/5 p-6 text-center space-y-3"
    >
      <p class="font-semibold text-error text-lg">Backend unreachable</p>
      <p class="text-sm text-base-content/70">{{ error }}</p>
      <button
        class="rounded bg-primary px-4 py-2 text-sm text-primary-content hover:opacity-90"
        @click="refresh"
      >Retry</button>
    </div>

    <template v-if="backendUp || loading">
      <StatusHeader
        :status="status"
        :loading="loading"
        :last-checked="lastChecked"
        :auto-refresh="autoRefresh"
        @refresh="refresh"
        @toggle-auto-refresh="toggleAutoRefresh"
      />

      <StatusStatTiles
        v-if="status"
        :status="status"
        @filter-change="onFilterChange"
        @scroll-to="scrollTo"
      />

      <StatusIssuesPanel
        v-if="status"
        :issues="issues"
        @anchor-click="scrollToAnchor"
      />

      <StatusDatabaseList v-if="status" :databases="status.databases" />

      <StatusResourceList
        v-if="status"
        :resources="status.resources"
        :is-dev="isDev"
        :action-loading="actionLoading"
        @publish="publishResource"
        @add-to-menu="addToMenu"
        @remove-from-menu="removeFromMenu"
      />

      <StatusEnumsSection v-if="status?.enums" :enums="status.enums" />

      <StatusI18nSection v-if="status?.i18n" :i18n="status.i18n" />

      <StatusRawJson v-if="status" :status="status" />

      <div v-if="loading && !status" class="text-base-content/60 text-sm">Loading status…</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import { collectIssues } from './status.utils';
import { useCroutonStatus } from './useCroutonStatus';
import StatusDatabaseList from './components/StatusDatabaseList.vue';
import StatusEnumsSection from './components/StatusEnumsSection.vue';
import StatusHeader from './components/StatusHeader.vue';
import StatusI18nSection from './components/StatusI18nSection.vue';
import StatusIssuesPanel from './components/StatusIssuesPanel.vue';
import StatusRawJson from './components/StatusRawJson.vue';
import StatusResourceList from './components/StatusResourceList.vue';
import StatusStatTiles from './components/StatusStatTiles.vue';

const {
  status, loading, error, backendUp, lastChecked, autoRefresh,
  actionLoading, isDev, refresh, toggleAutoRefresh,
  publishResource, addToMenu, removeFromMenu,
} = useCroutonStatus();

const router = useRouter();

const issues = computed(() => (status.value ? collectIssues(status.value) : []));

const onFilterChange = (filter: string) => {
  router.replace({ query: { ...router.currentRoute.value.query, filter: filter === 'all' ? undefined : filter } });
};

const scrollTo = (section: string) => {
  document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
};

const scrollToAnchor = (anchor: string) => {
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
};

onMounted(refresh);
</script>
