<template>
  <div>
    <div
      :class="[
        'flex gap-2',
        layout === 'row' ? 'flex-row items-center' : 'flex-col',
      ]"
    >
      <div
        v-for="(entry, index) in fields"
        :key="entry.key"
        class="flex-1"
      >
        <div
          :class="[
            'flex gap-2',
            layout === 'row' ? 'flex-col' : 'flex-row items-center',
          ]"
        >
          <div class="flex-1">
            <Dispatch
              v-for="(child, ci) in childElements"
              :key="ci"
              :uischema="child"
              :schema="itemSchema"
              :path-prefix="`${path}[${index}]`"
            />
          </div>
          <div v-if="showActions">
            <Btn
              v-if="fields.length > 1"
              :icon="IconEnum.Delete"
              :outline="true"
              @click="remove(index)"
            />
          </div>
        </div>
      </div>

      <div
        v-if="fields.length === 0"
        class="text-sm text-base-content/50"
      >
        No data
      </div>

      <div v-if="showActions">
        <Btn
          :icon="IconEnum.Plus"
          :outline="true"
          @click="push({})"
        >
          Add
        </Btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { useFieldArray } from 'vee-validate';
import { computed, inject } from 'vue';

import { Btn, IconEnum } from '@ghentcdh/ui';

import Dispatch from '../../Dispatch.vue';
import { resolveSchema, scopeToPath } from '../../scope';

const props = defineProps<{
  uischema: UISchemaElement;
  schema: JsonSchema;
}>();

const parentPrefix = inject<string>('pathPrefix', '');
const scope = (props.uischema as any).scope as string;
const scopePath = scopeToPath(scope);
const path = parentPrefix ? `${parentPrefix}.${scopePath}` : scopePath;

const rootSchema = inject<JsonSchema>('rootSchema')!;
const arraySchema = resolveSchema(rootSchema, scope);
const itemSchema = (arraySchema as any)?.items ?? {};

const { fields, push, remove } = useFieldArray(path);

// Auto-add first empty item
if (fields.value.length === 0) {
  push({});
}

const opts = ((props.uischema as any).options ?? {}) as Record<string, any>;
const layout = opts.layout ?? 'column';
const showActions = computed(() => !opts.hideActions);

const detail = computed<UISchemaElement | undefined>(
  () => (props.uischema as any)._detail ?? opts.detail,
);

const childElements = computed<UISchemaElement[]>(() => {
  if (!detail.value) {
    return (props.uischema as any).elements ?? [];
  }
  // If detail is a layout type, dispatch it as-is (e.g. CollapseLayout)
  const type = detail.value.type;
  if (type && type !== 'Control') {
    return [detail.value];
  }
  return (detail.value as any).elements ?? [detail.value];
});
</script>
