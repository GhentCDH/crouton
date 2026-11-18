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

// A string column holds the range as JSON; an object schema holds the object.
const range = computed<Record<string, unknown> | null>(() => {
  const v = value as unknown;
  if (typeof v !== 'string') return (v as Record<string, unknown> | null) ?? null;
  try {
    return JSON.parse(v) as Record<string, unknown>;
  } catch {
    return null;
  }
});
const from = computed(() => range.value?.[typedOptions.fromField ?? 'from']);
const to = computed(() => range.value?.[typedOptions.toField ?? 'to']);
</script>
