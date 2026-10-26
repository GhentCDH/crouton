<template>
  <div class="mt-2">
    <p class="text-xs font-medium text-base-content/60 mb-1">Sub-resources ({{ props.subResources.length }})</p>
    <table class="w-full text-xs border-collapse">
      <thead>
        <tr class="text-base-content/50 border-b border-base-300">
          <th class="text-left py-1 pr-2 font-normal w-4" />
          <th class="text-left py-1 pr-2 font-normal">Column</th>
          <th class="text-left py-1 pr-2 font-normal">Name</th>
          <th class="text-left py-1 pr-2 font-normal">Path</th>
          <th class="text-left py-1 pr-2 font-normal">Type</th>
          <th class="text-left py-1 font-normal">Status</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="sub in props.subResources" :key="sub.column">
          <tr
            class="border-b border-base-200 hover:bg-base-200/50 cursor-pointer"
            @click="toggle(sub.column)"
          >
            <td class="py-1 pr-2 text-base-content/40">
              <svg
                class="w-3 h-3 inline-block transition-transform"
                :class="expandedColumn === sub.column ? 'rotate-180' : ''"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </td>
            <td class="py-1 pr-2 font-mono text-base-content/70">{{ sub.column }}</td>
            <td class="py-1 pr-2 text-base-content">{{ sub.name }}</td>
            <td class="py-1 pr-2 font-mono text-base-content/70">{{ sub.path }}</td>
            <td class="py-1 pr-2">
              <span
                v-if="sub.relationType"
                class="px-1.5 py-0.5 rounded text-[10px] bg-base-200 text-base-content/70"
              >{{ sub.relationType }}</span>
            </td>
            <td class="py-1">
              <span
                class="inline-block w-2 h-2 rounded-full mr-1"
                :class="sub.valid ? 'bg-success' : 'bg-error'"
              />
              <span v-if="!sub.valid" class="text-error">error</span>
              <span v-else class="text-base-content/50">ok</span>
            </td>
          </tr>
          <tr v-if="sub.error" :key="`${sub.column}-error`">
            <td colspan="6" class="pb-1 pl-2">
              <pre class="bg-base-200 rounded p-1.5 text-xs font-mono text-error overflow-x-auto whitespace-pre-wrap break-all">{{ sub.error }}</pre>
            </td>
          </tr>
          <tr v-if="expandedColumn === sub.column" :key="`${sub.column}-preview`">
            <td colspan="6" class="pb-2 pt-1">
              <div class="border border-base-300 rounded p-3 bg-base-50 space-y-3">
                <p v-if="loading" class="text-xs text-base-content/50 italic">Loading…</p>
                <template v-else-if="activeDef">
                  <div>
                    <div class="text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-1">Compiled definition</div>
                    <pre class="text-xs bg-base-200 rounded p-2 overflow-x-auto max-h-48">{{ compiledJson }}</pre>
                  </div>
                  <StatusResourceDemoPreview :def="activeDef" />
                </template>
                <p v-else class="text-xs text-base-content/50 italic">No compiled definition available.</p>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { ResourceDefinition } from '../../composables/useCrouton';
import { useCrouton } from '../../composables/useCrouton';
import { StatusSubResourceListProperties } from './StatusSubResourceList.properties';
import StatusResourceDemoPreview from './StatusResourceDemoPreview.vue';

const props = defineProps(StatusSubResourceListProperties);

const crouton = useCrouton();
const expandedColumn = ref<string | null>(null);
const activeDef = ref<ResourceDefinition | null>(null);
const loading = ref(false);

const toggle = (column: string) => {
  expandedColumn.value = expandedColumn.value === column ? null : column;
};

watch(expandedColumn, async (column) => {
  if (!column) return;
  const sub = props.subResources.find((s) => s.column === column);
  if (!sub) return;
  loading.value = true;
  activeDef.value = null;
  try {
    activeDef.value = await crouton.getFormDefById(`${props.parentName}/${sub.path}`);
  } catch {
    activeDef.value = null;
  } finally {
    loading.value = false;
  }
});

const compiledJson = computed(() =>
  activeDef.value ? JSON.stringify(activeDef.value, null, 2) : '',
);
</script>
