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

const typedOptions = options as { fromField?: string; toField?: string };
const from = computed(() => {
  return value?.[typedOptions.fromField ?? 'from'];
});
const to = computed(() => {
  return value?.[typedOptions.toField ?? 'to'];
});
</script>
