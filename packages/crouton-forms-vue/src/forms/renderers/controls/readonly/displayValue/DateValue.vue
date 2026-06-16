<template>
  <p :dir="direction">
    {{ formatDate(displayValue) }} ·
    <small class="text-gray-500"> {{ relativeDate(displayValue) }}</small>
  </p>
</template>

<script setup lang="ts">
import { DisplayValueProperties } from './displayValue.properties';
import { formatDate, relativeDate } from './formatDate';

defineProps(DisplayValueProperties);
</script>
