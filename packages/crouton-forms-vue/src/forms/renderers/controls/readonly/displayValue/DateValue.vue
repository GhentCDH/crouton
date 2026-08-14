<template>
  <p :dir="direction">
    {{ formatted }}
    <small v-if="relative" class="text-gray-500">· {{ relative }}</small>
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { DisplayValueProperties } from './displayValue.properties';
import { formatDate, relativeDate } from './formatDate';

const props = defineProps(DisplayValueProperties);

/**
 * `withTime` is resolved upstream in `useReadonlyBinding`. Defaults to `true`
 * so a component rendered without it keeps the previous behaviour.
 */
const withTime = computed(() => (props.options as any)?.withTime !== false);

const formatted = computed(() =>
  formatDate(props.displayValue, { withTime: withTime.value }),
);

/**
 * "4 days ago" only earns its place on a timestamp. On a day-only field (a
 * birth date, a publication date) it is noise.
 */
const relative = computed(() =>
  withTime.value ? relativeDate(props.displayValue) : undefined,
);
</script>
