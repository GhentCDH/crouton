<template>
  <div
    class="text-xs bg-base-200 p-2 h-full border-b border-gray-200 max-w-96 last-of-type:border-b-0 text-left font-semibold text-text-accent flex items-center"
  >
    <span>{{ label }}</span>
  </div>
  <div
    class="h-full p-2 whitespace-pre-wrap break-words overflow-hidden min-w-0 text-sm"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ControlWrapperProperties } from '@ghentcdh/ui';

defineProps(ControlWrapperProperties);
</script>
