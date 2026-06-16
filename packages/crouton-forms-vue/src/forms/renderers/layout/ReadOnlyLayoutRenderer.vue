<template>
  <div
    class="grid items-center overflow-hidden"
    style="grid-template-columns: minmax(150px, auto) minmax(0, 1fr)"
  >
    <Dispatch
      v-for="(child, i) in (uischema as Layout).elements"
      :key="i"
      :uischema="child"
      :schema="schema"
    />
  </div>
</template>

<script setup lang="ts">
import type { JsonSchema, Layout, UISchemaElement } from '@jsonforms/core';

import Dispatch from '../../Dispatch.vue';

defineProps<{
  uischema: UISchemaElement;
  schema: JsonSchema;
}>();
</script>
