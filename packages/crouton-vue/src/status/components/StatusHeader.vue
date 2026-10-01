<template>
  <div
    class="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    :class="headerClasses"
  >
    <div class="flex items-center gap-2 flex-1 min-w-0">
      <span class="inline-block w-3 h-3 rounded-full shrink-0" :class="dotClass" />
      <span class="font-semibold text-base-content truncate">Crouton status</span>
      <div v-if="status" class="flex gap-1 flex-wrap ml-2">
        <span class="rounded bg-base-200 px-2 py-0.5 text-xs font-mono text-base-content">
          app v{{ status.version }}
        </span>
        <span class="rounded bg-base-200 px-2 py-0.5 text-xs font-mono text-base-content">
          crouton v{{ status.croutonVersion }}
        </span>
        <span class="rounded bg-base-200 px-2 py-0.5 text-xs font-mono text-base-content">
          {{ status.environment }}
        </span>
      </div>
    </div>
    <div class="flex items-center gap-3 text-sm text-base-content shrink-0">
      <span v-if="status && errorCount > 0" class="text-error font-medium">
        {{ errorCount }} error{{ errorCount !== 1 ? 's' : '' }}
      </span>
      <span v-if="status && warningCount > 0" class="text-warning font-medium">
        {{ warningCount }} warning{{ warningCount !== 1 ? 's' : '' }}
      </span>
      <span v-if="lastChecked" class="text-base-content/60 text-xs">
        checked {{ lastChecked.toLocaleTimeString() }}
      </span>
      <button
        class="rounded border border-base-300 p-1 hover:bg-base-200 transition-colors"
        :class="{ 'opacity-50': loading }"
        :disabled="loading"
        title="Refresh"
        @click="emit('refresh')"
      >
        <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
      <label class="flex items-center gap-1 cursor-pointer select-none text-xs">
        <input
          type="checkbox"
          class="rounded"
          :checked="autoRefresh"
          @change="emit('toggle-auto-refresh')"
        />
        auto
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { StatusHeaderProperties } from './StatusHeader.properties';

const props = defineProps(StatusHeaderProperties);
const emit = defineEmits<{
  refresh: [];
  'toggle-auto-refresh': [];
}>();

const errorCount = computed(() => {
  if (!props.status?.summary) return 0;
  return props.status.summary.databaseErrors + props.status.summary.resourceErrors;
});

const warningCount = computed(() => props.status?.summary?.warningCount ?? 0);

const worstState = computed(() => {
  if (errorCount.value > 0) return 'error';
  if (warningCount.value > 0) return 'warning';
  return 'ok';
});

const dotClass = computed(() => ({
  error: 'bg-error',
  warning: 'bg-warning',
  ok: 'bg-success',
}[worstState.value]));

const headerClasses = computed(() => ({
  error: 'border-error/40 bg-error/5',
  warning: 'border-warning/40 bg-warning/5',
  ok: 'border-success/40 bg-success/5',
}[worstState.value]));
</script>
