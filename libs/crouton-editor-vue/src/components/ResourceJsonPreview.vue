<script setup lang="ts">
import { ResourceJsonPreviewProperties } from './ResourceJsonPreview.properties';

defineProps(ResourceJsonPreviewProperties);
</script>

<template>
  <div>
    <pre
      class="bg-base-200 p-3 rounded text-xs font-mono overflow-auto max-h-[50vh] whitespace-pre-wrap"
    >{{ JSON.stringify(modelValue, null, 2) }}</pre>
  </div>
</template>
