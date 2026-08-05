<script setup lang="ts">
import { ref } from 'vue';

import { ResourceJsonPreviewProperties } from './ResourceJsonPreview.properties';

defineProps(ResourceJsonPreviewProperties);

const expanded = ref(false);

const toggle = () => {
  expanded.value = !expanded.value;
};
</script>

<template>
  <div class="border-t pt-3 mt-2">
    <button
      class="text-xs font-semibold opacity-70 hover:opacity-100 flex items-center gap-1"
      @click="toggle"
    >
      <span>{{ expanded ? '▼' : '▶' }}</span>
      Raw JSON preview
    </button>

    <div v-if="expanded" class="mt-2">
      <pre
        class="bg-base-200 p-3 rounded text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap"
      >{{ JSON.stringify(modelValue, null, 2) }}</pre>
    </div>
  </div>
</template>
