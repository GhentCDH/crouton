<template>
  <div class="flex flex-col gap-2">
    <h3 v-if="title" class="text-sm font-semibold text-base-content">{{ title }}</h3>
    <div class="grid grid-cols-12 gap-x-3 grid-flow-row-dense">
      <div
        v-for="(child, i) in (uischema as Layout).elements"
        :key="i"
        :class="[COLSPAN[(child as any).options?.colspan ?? 12], ROWSPAN[(child as any).options?.rowspan ?? 0]]"
      >
        <Dispatch :uischema="child" :schema="schema" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JsonSchema, Layout, UISchemaElement } from '@jsonforms/core';

import { COLSPAN, ROWSPAN } from './colspan';
import Dispatch from '../../Dispatch.vue';

const props = defineProps<{
  uischema: UISchemaElement;
  schema: JsonSchema;
}>();

const opts = (props.uischema as any).options ?? {};
const title = opts.title ?? (props.uischema as any).label;
</script>
