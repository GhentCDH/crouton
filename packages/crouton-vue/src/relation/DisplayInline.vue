<template>
  <div class="flex flex-col gap-1">
    {{ displayKey }}
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
import { Btn } from '@ghentcdh/ui';
import { FormDevSchema } from '../consumable/form-def.schema';

const props = defineProps<{
  data: any[] | null;
  schemas: FormDevSchema;
  uiSchema: any;
  actions?: any[];
  options: any[];
  // Accept but ignore the rest of the resource spread props
  [key: string]: any;
}>();

const schema = computed(() => props.schemas?.view);

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

/** Resolve the display value for a row cell, respecting dataPath and key options. */
const resolveValue = (
  row: any,
  col?: { scope: string; dataPath?: string; key?: string },
) => {
  return row[displayKey.value];

  const field = col.dataPath ?? col.scope.replace('#/properties/', '');
  const raw = row[field];
  if (raw === null || raw === undefined) return '-';
  if (col.key && typeof raw === 'object') return raw[col.key] ?? '-';
  if (typeof raw === 'boolean') return raw ? '✓' : '✗';
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
};
</script>
