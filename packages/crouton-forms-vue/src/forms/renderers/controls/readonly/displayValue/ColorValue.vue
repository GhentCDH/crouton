<template>
  <span
    v-if="value"
    class="inline-flex items-center gap-2"
  >
    <span
      class="inline-block size-4 shrink-0 rounded border border-base-300"
      :style="{ background: String(value) }"
    />
    <span class="font-mono">{{ value }}</span>
  </span>
  <NotSetValue v-else />
</template>

<script setup lang="ts">
import NotSetValue from './NotSetValue.vue';
import { DisplayValueProperties } from './displayValue.properties';

defineProps(DisplayValueProperties);
</script>
