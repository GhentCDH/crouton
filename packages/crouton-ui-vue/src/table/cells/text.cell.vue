<template>
  <div class="truncate">
    <a
      v-if="isLink"
      :href="value"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ value }}
    </a>
    <template v-else>
      {{ value }}
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { TextCellProperties } from './text.cell.properties';

const props = defineProps(TextCellProperties);

const value = computed(() => {
  // `dataPath` overrides the column id for reading nested data (e.g. included relations).
  const dataPath = props.column.options?.dataPath ?? props.column.id;
  const val = props.data[dataPath];
  if (val === null || val === undefined) return null;

  // `key` reads a nested property from the resolved value.
  const key = props.column.options?.key;
  if (key) return val[key] ?? null;

  if (props.column.options?.format === 'keyValue') {
    return val[props.column.options.key];
  }

  return val;
});

const isLink = computed(
  () => typeof value.value === 'string' && value.value.startsWith('http'),
);
</script>
