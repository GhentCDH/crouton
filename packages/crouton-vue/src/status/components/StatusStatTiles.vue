<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <button
      class="rounded-lg border p-3 text-left hover:bg-base-200 transition-colors"
      :class="dbOk ? 'border-success/40 bg-success/5' : 'border-error/40 bg-error/5'"
      @click="emit('scroll-to', 'databases')"
    >
      <div class="text-xs text-base-content/60 mb-1">Databases</div>
      <div class="font-semibold" :class="dbOk ? 'text-success' : 'text-error'">
        {{ dbConnected }}/{{ props.status.databases.length }}
      </div>
      <div class="text-xs text-base-content/60">connected</div>
    </button>

    <button
      class="rounded-lg border p-3 text-left hover:bg-base-200 transition-colors"
      :class="resourceOk ? 'border-success/40 bg-success/5' : 'border-error/40 bg-error/5'"
      @click="emit('filter-change', 'errors')"
    >
      <div class="text-xs text-base-content/60 mb-1">Resources</div>
      <div class="font-semibold" :class="resourceOk ? 'text-success' : 'text-error'">
        {{ resourceValid }}/{{ props.status.resources.length }}
      </div>
      <div class="text-xs text-base-content/60">valid</div>
    </button>

    <button
      class="rounded-lg border p-3 text-left hover:bg-base-200 transition-colors"
      :class="warningCount > 0 ? 'border-warning/40 bg-warning/5' : 'border-base-300'"
      @click="emit('filter-change', 'warnings')"
    >
      <div class="text-xs text-base-content/60 mb-1">Warnings</div>
      <div class="font-semibold" :class="warningCount > 0 ? 'text-warning' : 'text-base-content'">
        {{ warningCount }}
      </div>
      <div class="text-xs text-base-content/60">total</div>
    </button>

    <button
      class="rounded-lg border p-3 text-left hover:bg-base-200 transition-colors"
      :class="i18nMissing > 0 ? 'border-warning/40 bg-warning/5' : 'border-base-300'"
      @click="emit('scroll-to', 'i18n')"
    >
      <div class="text-xs text-base-content/60 mb-1">i18n missing</div>
      <div class="font-semibold" :class="i18nMissing > 0 ? 'text-warning' : 'text-base-content'">
        {{ i18nMissing }}
      </div>
      <div class="text-xs text-base-content/60">keys</div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { StatusStatTilesProperties } from './StatusStatTiles.properties';

const props = defineProps(StatusStatTilesProperties);
const emit = defineEmits<{
  'filter-change': [filter: string];
  'scroll-to': [section: string];
}>();

const dbConnected = computed(() => props.status.databases.filter((d) => d.connected).length);
const dbOk = computed(() => dbConnected.value === props.status.databases.length);
const resourceValid = computed(() => props.status.resources.filter((r) => r.valid && !r.draft).length);
const resourceOk = computed(() => props.status.summary.resourceErrors === 0);
const warningCount = computed(() => props.status.summary.warningCount);
const i18nMissing = computed(() =>
  props.status.i18n?.bundles.reduce((sum, b) => sum + b.emptyKeys, 0) ?? 0,
);
</script>
