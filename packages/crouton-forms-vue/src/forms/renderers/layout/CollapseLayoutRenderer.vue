<template>
  <Collapse :title="title">
    <div class="flex flex-col gap-4">
      <div
        v-for="(child, i) in (uischema as Layout).elements"
        :key="i"
        :class="COLSPAN[(child as any).options?.colspan ?? 12]"
      >
        <Dispatch
          :uischema="child"
          :schema="schema"
        />
      </div>
    </div>
  </Collapse>
</template>

<script setup lang="ts">
import type { JsonSchema, Layout, UISchemaElement } from '@jsonforms/core';
import { useFieldValue } from 'vee-validate';
import { computed, inject } from 'vue';

import { Collapse } from '@ghentcdh/ui';

import { COLSPAN } from './colspan';
import Dispatch from '../../Dispatch.vue';

const props = defineProps<{
  uischema: UISchemaElement;
  schema: JsonSchema;
}>();

const pathPrefix = inject<string>('pathPrefix', '');
const opts = (props.uischema as any).options ?? {};

const titleKeyField = opts.titleKey
  ? useFieldValue<string>(() =>
      pathPrefix ? `${pathPrefix}.${opts.titleKey}` : opts.titleKey,
    )
  : undefined;

const title = computed(() => {
  if (titleKeyField?.value) return titleKeyField.value;
  return (props.uischema as any).label ?? opts.title ?? 'Details';
});
</script>
