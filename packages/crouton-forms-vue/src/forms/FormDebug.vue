<template>
  <pre v-if="showErrors" class="border p-2 m-2 border-error">
    {{ errors }}
  </pre>
  <pre v-if="debugValue" class="border p-2 m-2 border-info">
    {{ currentValues }}
  </pre>
</template>
<script setup lang="ts">
import { FormDebugProperties } from './FormDebug.properties';

defineProps(FormDebugProperties);
</script>
