<template>
  <section id="resources">
    <h2 class="text-lg font-semibold mb-2 text-base-content">Resources</h2>

    <!-- filter + search bar -->
    <div class="flex flex-wrap gap-2 mb-3">
      <div class="flex rounded-lg border border-base-300 overflow-hidden text-sm">
        <button
          v-for="f in filters"
          :key="f.value"
          class="px-3 py-1.5 transition-colors"
          :class="currentFilter === f.value
            ? 'bg-primary text-primary-content'
            : 'hover:bg-base-200 text-base-content'"
          @click="setFilter(f.value)"
        >
          {{ f.label }}
        </button>
      </div>
      <input
        type="search"
        class="flex-1 min-w-32 rounded-lg border border-base-300 px-3 py-1.5 text-sm bg-base-100 text-base-content placeholder:text-base-content/40 focus:outline-none focus:border-primary"
        placeholder="Search…"
        :value="currentSearch"
        @input="setSearch(($event.target as HTMLInputElement).value)"
      />
    </div>

    <p v-if="filtered.length === 0" class="text-sm text-base-content/60">
      No resources match.
    </p>
    <div class="space-y-2">
      <StatusResourceRow
        v-for="res in filtered"
        :key="res.name"
        :resource="res"
        :expanded="expandedSet.has(res.name)"
        :is-dev="props.isDev"
        :action-loading="props.actionLoading"
        @toggle="toggleExpand(res.name)"
        @publish="emit('publish', $event)"
        @add-to-menu="emit('add-to-menu', $event)"
        @remove-from-menu="emit('remove-from-menu', $event)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { resourceState, sortResources } from '../status.utils';
import { StatusResourceListProperties } from './StatusResourceList.properties';
import StatusResourceRow from './StatusResourceRow.vue';

const props = defineProps(StatusResourceListProperties);
const emit = defineEmits<{
  publish: [name: string];
  'add-to-menu': [name: string];
  'remove-from-menu': [name: string];
}>();

const route = useRoute();
const router = useRouter();

const filters = [
  { value: 'all', label: 'All' },
  { value: 'errors', label: 'Errors' },
  { value: 'warnings', label: 'Warnings' },
  { value: 'draft', label: 'Draft' },
  { value: 'hidden', label: 'Hidden' },
];

const currentFilter = computed(() => (route.query.filter as string) || 'all');
const currentSearch = computed(() => (route.query.q as string) || '');

const setFilter = (f: string) => {
  router.replace({ query: { ...route.query, filter: f === 'all' ? undefined : f } });
};

const setSearch = (q: string) => {
  router.replace({ query: { ...route.query, q: q || undefined } });
};

const sorted = computed(() => sortResources(props.resources));

const filtered = computed(() => {
  let list = sorted.value;
  if (currentFilter.value !== 'all') {
    list = list.filter((r) => {
      const s = resourceState(r);
      if (currentFilter.value === 'errors') return s === 'error';
      if (currentFilter.value === 'warnings') return s === 'warning' || s === 'migration';
      if (currentFilter.value === 'draft') return s === 'draft';
      if (currentFilter.value === 'hidden') return s === 'hidden';
      return true;
    });
  }
  if (currentSearch.value) {
    const q = currentSearch.value.toLowerCase();
    list = list.filter((r) => r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
  }
  return list;
});

// auto-expand error rows
const expandedSet = ref<Set<string>>(new Set());

watch(
  () => props.resources,
  (resources) => {
    for (const r of resources ?? []) {
      if (resourceState(r) === 'error') expandedSet.value.add(r.name);
    }
  },
  { immediate: true },
);

const toggleExpand = (name: string) => {
  if (expandedSet.value.has(name)) expandedSet.value.delete(name);
  else expandedSet.value.add(name);
  // trigger reactivity on Set mutation
  expandedSet.value = new Set(expandedSet.value);
};
</script>
