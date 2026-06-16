<template>
  <a
    :href="String(displayValue)"
    target="_blank"
    rel="noopener noreferrer"
  >
    {{ displayValue }}
  </a>
</template>

<script setup lang="ts">
import { DisplayValueProperties } from './displayValue.properties';

defineProps(DisplayValueProperties);
</script>
