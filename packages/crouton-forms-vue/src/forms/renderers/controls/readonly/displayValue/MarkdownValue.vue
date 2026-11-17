<template>
  <!-- Plain text: interpolation escapes it, pre-line keeps the line breaks. -->
  <div class="prose prose-sm max-w-none whitespace-pre-line">{{ value ?? '' }}</div>
</template>

<script setup lang="ts">
import { DisplayValueProperties } from './displayValue.properties';

defineProps(DisplayValueProperties);
</script>
