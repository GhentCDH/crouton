<template>
  <div class="flex flex-col gap-1">
    {{ displayKey }}
    {{ valueKey }}
    <div v-if="!data?.length" class="text-sm text-gray-400 italic py-1">
      No records
    </div>
    <div
      v-for="(row, i) in data"
      :key="i"
      class="flex items-center justify-between gap-4 py-1.5 px-2 rounded hover:bg-base-200 text-sm border border-base-200"
    >
      schema:
      {{ resolveValue(row) }}

      <!-- Column values -->
      <div class="flex items-center gap-4 flex-wrap" v-if="false">
        <span
          v-for="col in displayColumns"
          :key="col.scope"
          class="flex items-center gap-1"
        >
          <span class="text-gray-500 text-xs">{{ col.label }}:</span>
          <span class="font-medium">{{ resolveValue(row, col) }}</span>
        </span>
      </div>

      <!-- Row actions (view / edit / delete / custom) -->
      <div class="flex items-center gap-1 shrink-0">
        <template
          v-for="action in actions"
          :key="action.tooltip ?? action.label ?? action.icon"
        >
          <Btn
            v-if="!action.visible || action.visible(row)"
            size="xs"
            color="secondary"
            :icon="action.icon"
            :aria-label="action.tooltip ?? action.label"
            @click="action.action(row)"
          >
            <!-- Only render text for labeled actions (not icon-only view/edit/delete) -->
            <template v-if="action.label">{{ action.label }}</template>
          </Btn>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Btn } from '@ghentcdh/crouton-ui-vue';
import type { FormDevSchema } from '@ghentcdh/crouton-core';

const props = defineProps<{
  data: any[] | null;
  schemas: FormDevSchema;
  uiSchema: any;
  actions?: any[];
  options: any;
  // Accept but ignore the rest of the resource spread props
  [key: string]: any;
}>();

console.log(props);
/** Extract display columns from the table UI schema elements (includes calculated columns). */
const displayColumns = computed(() => {
  const elements: any[] = props.uiSchema?.elements ?? [];
  return elements
    .filter((el) => el.scope && el.options?.label)
    .map((el) => ({
      scope: el.scope as string,
      label: el.options.label as string,
      dataPath: el.options?.dataPath as string | undefined,
      key: el.options?.key as string | undefined,
    }));
});

const displayKey = computed(() => {
  return props.options.displayKey ?? 'id';
});

const valueKey = computed(() => {
  return props.options.valueKey;
});

const resolveValue = (row: any, _col?: unknown) => {
  return row[displayKey.value];
};
</script>
