<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

import { ResourceJsonEditorProperties } from './ResourceJsonEditor.properties';
import ResourceColumnsEditor from './ResourceColumnsEditor.vue';
import ResourceFieldsPanel from './ResourceFieldsPanel.vue';
import ResourceJsonPreview from './ResourceJsonPreview.vue';
import {
  type EditableColumn,
  type FieldVariant,
  type FieldVariantPatch,
  type Tab,
  TABS,
  toDraft,
  type VariantDraft,
} from '../types/resource-schema-editor.types';

const props = defineProps(ResourceJsonEditorProperties);

const emits = defineEmits<{
  'update:modelValue': [value: ResourceJsonInput];
  save: [value: ResourceJsonInput];
}>();

// ── Local editing state derived from modelValue ──────────────────────

/** Editable copy of columns from the raw JSON. */
const columns = ref<EditableColumn[]>([]);

/** Per-column, per-context drafts for variant editing. */
const drafts = reactive<Record<string, Record<Tab, VariantDraft>>>({});

/** Local copy of top-level fields (everything except columns). */
const resourceFields = ref<ResourceJsonInput>({ ...props.modelValue });

const hasRawJsonErrors = computed(() =>
  Object.values(drafts).some((tabs) =>
    TABS.some(({ key }) => tabs[key]?.rawOptionsError),
  ),
);

// ── Active section (tabs) ────────────────────────────────────────────

type Section = 'settings' | 'columns' | 'json';
const activeSection = ref<Section>('settings');

/**
 * Converts raw columns from the resource.json input into EditableColumn[].
 * Handles both map form (id-keyed object) and array form.
 */
const parseColumns = (raw: ResourceJsonInput): EditableColumn[] => {
  const rawCols = raw.columns;
  if (!rawCols) return [];

  const entries: [string, Record<string, unknown>][] = Array.isArray(rawCols)
    ? (rawCols as Record<string, unknown>[]).map((c) => [c['id'] as string, c])
    : Object.entries(rawCols as Record<string, Record<string, unknown>>);

  return entries.map(([id, col]) => ({
    id,
    label: col['label'] as string | undefined,
    column: (col['column'] as string) ?? id,
    hiddenInTable: !!col['hiddenInTable'],
    hiddenInForm: !!col['hiddenInForm'],
    hiddenInView: !!col['hiddenInView'],
    form: col['fieldInput'] as FieldVariant | undefined,
    view: {
      resolved: (col['fieldView'] ?? col['fieldInput']) as
        FieldVariant | undefined,
      hasOverride: !!col['fieldView'],
    },
    table: {
      resolved: (col['fieldTable'] ?? col['fieldView'] ?? col['fieldInput']) as
        FieldVariant | undefined,
      hasOverride: !!col['fieldTable'],
    },
  }));
};

// Initialize from modelValue
watch(
  () => props.modelValue,
  (raw) => {
    resourceFields.value = { ...raw };
    const parsed = parseColumns(raw);
    columns.value = parsed;
    for (const col of parsed) {
      drafts[col.id] = {
        form: toDraft(col.form),
        view: toDraft(col.view.resolved),
        table: toDraft(col.table.resolved),
      };
    }
  },
  { immediate: true },
);

// ── Build output ─────────────────────────────────────────────────────

const jsonEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Builds a variant patch from a draft by diffing against the original.
 */
const buildVariantPatch = (
  draft: VariantDraft,
  original: FieldVariant | undefined,
): FieldVariantPatch | undefined => {
  let rest: Record<string, unknown> = {};
  try {
    rest = draft.rawOptionsJson.trim() ? JSON.parse(draft.rawOptionsJson) : {};
  } catch {
    return undefined;
  }

  const editedOptions: Record<string, unknown> = { ...rest };
  if (draft.displayKey) editedOptions['displayKey'] = draft.displayKey;
  if (draft.colspan != null) editedOptions['colspan'] = draft.colspan;

  const originalOptions = (original?.options ?? {}) as Record<string, unknown>;
  const optionKeys = new Set([
    ...Object.keys(editedOptions),
    ...Object.keys(originalOptions),
  ]);
  const optionsPatch: Record<string, unknown> = {};
  for (const key of optionKeys) {
    const before = originalOptions[key];
    const after = editedOptions[key];
    if (jsonEqual(before, after)) continue;
    optionsPatch[key] = after === undefined ? null : after;
  }

  const patch: FieldVariantPatch = {};
  if (draft.position !== original?.position) {
    patch.position = draft.position ?? null;
  }
  if (draft.type !== original?.type) {
    patch.type = draft.type ?? null;
  }
  if (Object.keys(optionsPatch).length) patch.options = optionsPatch;

  return Object.keys(patch).length ? patch : undefined;
};

/**
 * Rebuilds the full resource.json from the current editing state.
 * Preserves the original column format (map vs array).
 */
const buildOutput = (): ResourceJsonInput => {
  const base = { ...resourceFields.value };
  const rawCols = props.modelValue.columns;

  if (!rawCols || !columns.value.length) {
    return base;
  }

  // Determine original format
  const isArray = Array.isArray(rawCols);

  if (isArray) {
    const updated = (rawCols as Record<string, unknown>[]).map(
      (origCol: Record<string, unknown>) => {
        const id = origCol['id'] as string;
        const editedCol = columns.value.find((c) => c.id === id);
        if (!editedCol) return origCol;

        const merged: Record<string, unknown> = { ...origCol };
        merged['label'] = editedCol.label;
        merged['column'] = editedCol.column;
        merged['hiddenInTable'] = editedCol.hiddenInTable;
        merged['hiddenInForm'] = editedCol.hiddenInForm;
        merged['hiddenInView'] = editedCol.hiddenInView;

        const d = drafts[id];
        if (d) {
          const formPatch = buildVariantPatch(d.form, editedCol.form);
          const viewPatch = buildVariantPatch(d.view, editedCol.view.resolved);
          const tablePatch = buildVariantPatch(
            d.table,
            editedCol.table.resolved,
          );
          if (formPatch) {
            merged['fieldInput'] = applyVariantPatch(
              origCol['fieldInput'] as Record<string, unknown> | undefined,
              formPatch,
            );
          }
          if (viewPatch) {
            merged['fieldView'] = applyVariantPatch(
              origCol['fieldView'] as Record<string, unknown> | undefined,
              viewPatch,
            );
          }
          if (tablePatch) {
            merged['fieldTable'] = applyVariantPatch(
              origCol['fieldTable'] as Record<string, unknown> | undefined,
              tablePatch,
            );
          }
        }

        return merged;
      },
    );
    // Cast: raw JSON may use array form even though the Zod input type
    // only declares map form — the runtime value is passed through as-is.
    return {
      ...base,
      columns: updated as unknown as ResourceJsonInput['columns'],
    };
  }

  // Map form
  const rawMap = rawCols as Record<string, Record<string, unknown>>;
  const updatedMap: Record<string, Record<string, unknown>> = {};

  for (const [id, origCol] of Object.entries(rawMap)) {
    const editedCol = columns.value.find((c) => c.id === id);
    if (!editedCol) {
      updatedMap[id] = origCol;
      continue;
    }

    const merged: Record<string, unknown> = { ...origCol };
    merged['label'] = editedCol.label;
    merged['column'] = editedCol.column;
    merged['hiddenInTable'] = editedCol.hiddenInTable;
    merged['hiddenInForm'] = editedCol.hiddenInForm;
    merged['hiddenInView'] = editedCol.hiddenInView;

    const d = drafts[id];
    if (d) {
      const formPatch = buildVariantPatch(d.form, editedCol.form);
      const viewPatch = buildVariantPatch(d.view, editedCol.view.resolved);
      const tablePatch = buildVariantPatch(d.table, editedCol.table.resolved);
      if (formPatch) {
        merged['fieldInput'] = applyVariantPatch(
          origCol['fieldInput'] as Record<string, unknown> | undefined,
          formPatch,
        );
      }
      if (viewPatch) {
        merged['fieldView'] = applyVariantPatch(
          origCol['fieldView'] as Record<string, unknown> | undefined,
          viewPatch,
        );
      }
      if (tablePatch) {
        merged['fieldTable'] = applyVariantPatch(
          origCol['fieldTable'] as Record<string, unknown> | undefined,
          tablePatch,
        );
      }
    }

    updatedMap[id] = merged;
  }

  return { ...base, columns: updatedMap };
};

/**
 * Applies a variant patch to an existing raw variant object.
 */
const applyVariantPatch = (
  existing: Record<string, unknown> | undefined,
  patch: FieldVariantPatch,
): Record<string, unknown> => {
  const base = { ...(existing ?? {}) };
  if (patch.position !== undefined) {
    if (patch.position === null) delete base['position'];
    else base['position'] = patch.position;
  }
  if (patch.type !== undefined) {
    if (patch.type === null) delete base['type'];
    else base['type'] = patch.type;
  }
  if (patch.options) {
    const opts = (base['options'] ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(patch.options)) {
      if (v === null) delete opts[k];
      else opts[k] = v;
    }
    base['options'] = Object.keys(opts).length ? opts : undefined;
  }
  return base;
};

// ── Emit on changes ──────────────────────────────────────────────────

const onFieldsUpdate = (updated: ResourceJsonInput) => {
  resourceFields.value = updated;
  emitUpdate();
};

const emitUpdate = () => {
  const output = buildOutput();
  emits('update:modelValue', output);
};

/**
 * Current live draft of the full resource.json — used by the JSON preview
 * and as the value emitted on save.
 */
const currentDraft = computed(() => buildOutput());

defineExpose({ hasRawJsonErrors });
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="alert alert-warning text-sm">
      <span>
        Edits here write directly to <code>resource.json</code>. If
        <code>crouton update resources</code> runs from the CLI at the same
        time, whichever save happens last wins — there's no conflict detection
        yet.
      </span>
    </div>

    <!-- Tab bar -->
    <div role="tablist" class="tabs tabs-box tabs-sm w-fit">
      <a
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeSection === 'settings' }"
        @click="activeSection = 'settings'"
      >
        Settings
      </a>
      <a
        v-if="columns.length"
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeSection === 'columns' }"
        @click="activeSection = 'columns'"
      >
        Columns
        <span class="badge badge-sm ml-1.5">{{ columns.length }}</span>
      </a>
      <a
        role="tab"
        class="tab"
        :class="{ 'tab-active': activeSection === 'json' }"
        @click="activeSection = 'json'"
      >
        JSON
      </a>
    </div>

    <!-- Settings tab -->
    <div v-show="activeSection === 'settings'">
      <ResourceFieldsPanel
        :model-value="resourceFields"
        @update:model-value="onFieldsUpdate"
      />
    </div>

    <!-- Columns tab -->
    <div v-show="activeSection === 'columns'" v-if="columns.length">
      <ResourceColumnsEditor :columns="columns" :drafts="drafts" />
    </div>

    <!-- JSON tab -->
    <div v-show="activeSection === 'json'">
      <ResourceJsonPreview :model-value="currentDraft" :expanded="true" />
    </div>
  </div>
</template>
