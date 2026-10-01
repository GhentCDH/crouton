<template>
  <section>
    <button
      class="flex items-center gap-2 w-full p-3 rounded-lg border border-base-300 bg-base-200 hover:bg-base-300 transition-colors text-sm"
      @click="open = !open"
    >
      <svg
        class="w-4 h-4 transition-transform"
        :class="open ? 'rotate-180' : ''"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
      <span class="font-semibold text-base-content">Raw JSON</span>
      <div class="ml-auto flex gap-2">
        <button
          class="text-xs px-2 py-0.5 rounded border border-base-300 hover:bg-base-100 text-base-content"
          @click.stop="copy"
        >copy</button>
        <button
          class="text-xs px-2 py-0.5 rounded border border-base-300 hover:bg-base-100 text-base-content"
          @click.stop="download"
        >download</button>
      </div>
    </button>
    <div v-if="open" class="mt-1 rounded-lg border border-base-300 overflow-hidden">
      <pre class="p-3 text-xs font-mono text-base-content bg-base-100 overflow-x-auto whitespace-pre-wrap break-all max-h-96">{{ json }}</pre>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { StatusRawJsonProperties } from './StatusRawJson.properties';

const props = defineProps(StatusRawJsonProperties);

const open = ref(false);
const json = computed(() => JSON.stringify(props.status, null, 2));

const copy = () => navigator.clipboard.writeText(json.value);

const download = () => {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const env = props.status.environment ?? 'unknown';
  const blob = new Blob([json.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crouton-status-${env}-${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>
