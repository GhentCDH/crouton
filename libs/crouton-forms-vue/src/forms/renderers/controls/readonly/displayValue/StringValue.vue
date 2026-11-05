<template>
  <p
    v-if="displayValue"
    :dir="direction"
  >
    {{ displayValue }}
  </p>
  <NotSetValue v-else />
</template>

<script setup lang="ts">
import NotSetValue from './NotSetValue.vue';
import { DisplayValueProperties } from './displayValue.properties';

defineProps(DisplayValueProperties);
</script>
