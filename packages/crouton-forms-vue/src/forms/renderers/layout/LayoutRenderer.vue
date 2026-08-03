<template>
  <div v-if="isLayout" :class="getLayout">
    <div
      v-for="(child, i) in (uischema as Layout).elements"
      :key="i"
      :class="COLSPAN[(child as any).options?.colspan ?? 12]"
    >
      <Dispatch :uischema="child" :schema="schema" />
    </div>
  </div>

  <div v-else class="flex flex-col gap-3">No Applicable Layout found</div>
</template>

<script setup lang="ts">
import type { JsonSchema, Layout, UISchemaElement } from '@jsonforms/core';
import { computed } from 'vue';

import { COLSPAN } from './colspan';
import Dispatch from '../../Dispatch.vue';

const props = defineProps<{
  uischema: UISchemaElement;
  schema: JsonSchema;
}>();

const LAYOUT: Record<string, string> = {
  // Stack on narrow viewports (e.g. small modals), switch to the 12-column
  // grid at md+. Children keep their `col-span-*`; with a single column the
  // span clamps to full width, so fields stack cleanly.
  GridLayout: 'grid grid-cols-1 gap-x-3 md:grid-cols-12',
  HorizontalLayout: 'flex flex-col gap-y-3 md:flex-row',
  VerticalLayout: 'flex flex-col gap-3',
};

const getLayout = computed(() => LAYOUT[props.uischema.type]);
const isLayout = computed(() => props.uischema.type in LAYOUT);
</script>
