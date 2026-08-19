<template>
  <!-- A single meaningful key (displayKey) reads better as plain text. -->
  <span v-if="singleValue !== null">{{ singleValue }}</span>

  <dl
    v-else-if="entries.length"
    class="grid grid-cols-[auto_1fr] gap-x-3 text-sm"
  >
    <template v-for="entry in entries" :key="entry.key">
      <dt class="text-base-content/60">{{ entry.label }}</dt>
      <dd class="break-words">{{ entry.value }}</dd>
    </template>
  </dl>

  <pre v-else class="block overflow-auto text-sm" style="max-height: 200px">{{
    displayValue
  }}</pre>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { DisplayValueProperties } from './displayValue.properties';

/**
 * Read-only rendering of an object value.
 *
 * Previously always a `<pre>` JSON dump. Now:
 * - a `displayKey` option renders just that key as text;
 * - a flat object renders as a definition list of its scalar entries;
 * - anything else (nested objects, arrays) still falls back to the dump.
 */
const props = defineProps(DisplayValueProperties);

const labelFor = (key: string): string =>
  key.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

const record = computed<Record<string, unknown> | null>(() => {
  const value = props.value;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
});

const singleValue = computed<string | null>(() => {
  const displayKey = (props.options as Record<string, unknown> | undefined)?.[
    'displayKey'
  ];
  if (typeof displayKey !== 'string' || !record.value) return null;
  const resolved = displayKey
    .split('.')
    .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), record.value);
  return resolved === null || resolved === undefined ? null : String(resolved);
});

const entries = computed(() => {
  if (!record.value) return [];
  const all = Object.entries(record.value);
  const scalars = all.filter(
    ([, value]) => value === null || typeof value !== 'object',
  );
  // Mixed/nested objects are clearer as a dump than a half-rendered list.
  if (scalars.length !== all.length) return [];
  return scalars.map(([key, value]) => ({
    key,
    label: labelFor(key),
    value: value === null || value === undefined ? '—' : String(value),
  }));
});
</script>
