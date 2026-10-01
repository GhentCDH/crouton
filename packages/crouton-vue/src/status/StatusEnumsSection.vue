<template>
  <!-- Moved to components/StatusEnumsSection.vue -->
  <StatusEnumsSection v-bind="$props" />
</template>

<script setup lang="ts">
import StatusEnumsSection from './components/StatusEnumsSection.vue';
import { StatusEnumsSectionProperties } from './components/StatusEnumsSection.properties';

defineProps(StatusEnumsSectionProperties);
</script>
