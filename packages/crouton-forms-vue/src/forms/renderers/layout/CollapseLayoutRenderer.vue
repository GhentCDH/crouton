<template>
  <Collapse :title="title">
    <div class="flex flex-col gap-4">
      <div
        v-for="(child, i) in (uischema as Layout).elements"
        :key="i"
        :class="[
          COLSPAN[(child as any).options?.colspan ?? 12],
          ROWSPAN[(child as any).options?.rowspan ?? 0],
        ]"
      >
        <Dispatch :uischema="child" :schema="schema" />
      </div>
    </div>
  </Collapse>
</template>

<script setup lang="ts">
import type { JsonSchema, Layout, UISchemaElement } from '@jsonforms/core';
import { useFieldValue } from 'vee-validate';
import { computed, inject } from 'vue';

import { Collapse } from '@ghentcdh/crouton-ui-vue';

import { COLSPAN, ROWSPAN } from './colspan';
import Dispatch from '../../Dispatch.vue';

const props = defineProps<{
  uischema: UISchemaElement;
  schema: JsonSchema;
}>();

type CollapseUi = UISchemaElement & { options?: { titleKey?: string; title?: string }; label?: string };

const pathPrefix = inject<string>('pathPrefix', '');
const ui = props.uischema as CollapseUi;
const opts = ui.options ?? {};

const titleKeyField = opts.titleKey
  ? useFieldValue<string>(() =>
      pathPrefix ? `${pathPrefix}.${opts.titleKey}` : (opts.titleKey ?? ''),
    )
  : undefined;

const title = computed(() => {
  if (titleKeyField?.value) return titleKeyField.value;
  return ui.label ?? opts.title ?? 'Details';
});
</script>
