<template>
  <p>
    <small class="text-gray-500">{{ options.fromLabel ?? 'From' }}: </small>
    {{ from }} <br />
    <small class="text-gray-500">{{ options.toLabel ?? 'To' }}: </small>
    {{ to }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DateRangeValueProperties } from './DateRangeValue.properties';

const { options, value } = defineProps(DateRangeValueProperties);

const from = computed(() => {
  return value?.[options.fromField ?? 'from'];
});
const to = computed(() => {
  return value?.[options.toField ?? 'to'];
});
</script>
