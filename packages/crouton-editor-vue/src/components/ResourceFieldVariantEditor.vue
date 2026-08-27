<script setup lang="ts">
import { computed } from 'vue';

import {
  Btn,
  Input,
  InputNumber,
  SelectComponent,
  Textarea,
} from '@ghentcdh/ui';

import { ResourceFieldVariantEditorProperties } from './ResourceFieldVariantEditor.properties';
import {
  COLSPAN_OPTIONS,
  colspanLabel,
  type Tab,
  visibleTabs,
} from '../types/resource-schema-editor.types';

const props = defineProps(ResourceFieldVariantEditorProperties);

const emits = defineEmits<{
  'update:activeTab': [tab: Tab];
}>();

const tabs = computed(() => visibleTabs(props.col));

/** The draft object for whichever tab is active — mutated directly by the inputs below. */
const draft = computed(() => props.drafts[props.activeTab]);

const colspanOptions = COLSPAN_OPTIONS.map((n) => ({
  label: colspanLabel(n),
  value: n,
}));

/**
 * Clears a first-class field back to "no local value". Combined with the
 * diffing in `buildVariantPatch` (ResourceSchemaEditor.vue), this is what
 * sends `null` for that key — on the Form tab that clears a previously-set
 * override outright; on View/Table it's a "reset to inherited" (the value
 * falls back to the level below again instead of staying pinned here).
 */
const resetField = (field: 'position' | 'displayKey' | 'colspan') => {
  if (field === 'displayKey') draft.value.displayKey = '';
  else draft.value[field] = undefined;
};

const validateRawJson = () => {
  try {
    if (draft.value.rawOptionsJson.trim())
      JSON.parse(draft.value.rawOptionsJson);
    draft.value.rawOptionsError = null;
  } catch {
    draft.value.rawOptionsError =
      'Invalid JSON — fix or clear this before saving.';
  }
};
</script>

<template>
  <div class="p-4 flex flex-col gap-3">
    <p v-if="!tabs.length" class="text-sm opacity-60">
      This column is hidden in every context (table, form, and view) — nothing
      to edit here.
    </p>
    <template v-else>
      <div
        role="tablist"
        class="flex gap-1 rounded-lg bg-base-200 p-1 text-sm w-fit"
      >
        <button
          v-for="tab in tabs"
          :key="tab.key"
          role="tab"
          class="rounded-md px-3 py-1.5 font-medium transition-colors"
          :class="
            activeTab === tab.key
              ? 'bg-base-100 shadow-sm'
              : 'hover:bg-base-300/50'
          "
          @click="emits('update:activeTab', tab.key)"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'view' && col.view.hasOverride"
            class="ml-1.5 inline-block h-2 w-2 rounded-full bg-primary"
          />
          <span
            v-if="tab.key === 'table' && col.table.hasOverride"
            class="ml-1.5 inline-block h-2 w-2 rounded-full bg-primary"
          />
        </button>
      </div>

      <p class="text-sm opacity-70">
        <template v-if="activeTab === 'form'">
          Base config used to render the create/edit form. View and Table fall
          back to this unless they override it.
        </template>
        <template v-else-if="activeTab === 'view'">
          Read-only detail view.
          {{
            col.view.hasOverride
              ? 'This column has its own view override.'
              : 'Currently inherited from Form — values shown below are the resolved (effective) ones.'
          }}
        </template>
        <template v-else>
          Table cell rendering.
          {{
            col.table.hasOverride
              ? 'This column has its own table override.'
              : 'Currently inherited from View/Form — values shown below are the resolved (effective) ones.'
          }}
        </template>
      </p>

      <div class="grid grid-cols-3 gap-3 max-w-2xl">
        <label class="form-control">
          <span class="label-text text-xs">Display key</span>
          <div class="flex gap-1 items-center">
            <Input
              v-model="draft.displayKey"
              size="sm"
              placeholder="e.g. name"
            />
            <Btn
              v-if="activeTab !== 'form'"
              color="secondary"
              :outline="true"
              size="sm"
              title="Reset to inherited"
              @click="resetField('displayKey')"
            >
              ×
            </Btn>
          </div>
        </label>

        <label class="form-control">
          <span class="label-text text-xs">Position</span>
          <div class="flex gap-1 items-center">
            <InputNumber width="w-4" v-model="draft.position" size="sm" />
            <Btn
              v-if="activeTab !== 'form'"
              color="secondary"
              :outline="true"
              size="sm"
              title="Reset to inherited"
              @click="resetField('position')"
            >
              ×
            </Btn>
          </div>
        </label>

        <label v-if="activeTab !== 'table'" class="form-control">
          <span class="label-text text-xs">Colspan</span>
          <div class="flex gap-1 items-center">
            <SelectComponent
              size="sm"
              width="!w-4"
              :value="draft.colspan ?? 12"
              :options="colspanOptions"
              :clearable="false"
              @change="(opt) => (draft.colspan = opt.value)"
            />
            <Btn
              v-if="activeTab !== 'form'"
              color="secondary"
              :outline="true"
              size="sm"
              title="Reset to inherited"
              @click="resetField('colspan')"
            >
              ×
            </Btn>
          </div>
        </label>
      </div>

      <label class="form-control max-w-2xl">
        <span class="label-text text-xs">
          Other options (raw JSON — e.g. <code>display</code>,
          <code>sort</code>). Set a key to <code>null</code> to reset it back to
          the inherited value.
        </span>
        <Textarea
          v-model="draft.rawOptionsJson"
          size="sm"
          :rows="4"
          width="!full"
          class="font-mono w-full text-xs"
          @blur="validateRawJson"
        />
        <span v-if="draft.rawOptionsError" class="text-error text-xs mt-1">
          {{ draft.rawOptionsError }}
        </span>
      </label>
    </template>
  </div>
</template>
