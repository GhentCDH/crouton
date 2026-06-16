<template>
  <div
    class="prose prose-sm max-w-none"
    v-html="renderedHtml"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { DisplayValueProperties } from './displayValue.properties';

const props = defineProps(DisplayValueProperties);

const renderedHtml = computed(() => {
  const raw = props.value as string;

  if (!raw) return '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
});
</script>
