<template>
  <p :dir="direction">
    <small class="text-gray-500">{{ options.fromLabel ?? 'From' }}: </small>
    {{ from }} <br />
    <small class="text-gray-500">{{ options.toLabel ?? 'To' }}: </small>
    {{ to }}
  </p>
</template>

<script setup lang="ts">
import { DisplayValueProperties } from './displayValue.properties';
import { computed } from 'vue';

const { options, displayValue, value } = defineProps(DisplayValueProperties);

const from = computed(() => {
  return value?.[options.fromField ?? 'from'];
});
const to = computed(() => {
  return value?.[options.toField ?? 'to'];
});
</script>
