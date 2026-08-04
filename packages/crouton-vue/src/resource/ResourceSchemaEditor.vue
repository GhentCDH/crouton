<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { Btn, IconEnum, Modal } from '@ghentcdh/ui';

import { computedAsync } from '../utils/computedAsync';
import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';
import { ResourceSchemaEditorProperties } from './ResourceSchemaEditor.properties';

const props = defineProps(ResourceSchemaEditorProperties);

const emits = defineEmits<{
  closeModal: [];
  /** Emitted after a successful save, so ResourceTable can refetch its config. */
  saved: [];
}>();

/** Mirrors crouton-core's `FieldInput` shape closely enough for editing. */
type FieldVariant = {
  type?: string;
  format?: string;
  resource?: string;
  relationType?: string;
  position?: number;
  options?: Record<string, unknown>;
};

/**
 * Mirrors the backend's `EditableFieldVariant`/`EditableColumn` response
 * shapes — see `payload-builders.ts`'s `buildEditableColumnsPayload`.
 */
type EditableFieldVariant = {
  resolved?: FieldVariant;
  hasOverride: boolean;
};

type EditableColumn = {
  id: string;
  label?: string;
  column: string;
  hiddenInTable: boolean;
  hiddenInForm: boolean;
  hiddenInView: boolean;
  form?: FieldVariant;
  view: EditableFieldVariant;
  table: EditableFieldVariant;
};

/** Body shape for one variant patch — see `PatchResourceJson.schema.ts`. */
type FieldVariantPatch = Partial<{
  position: number | null;
  options: Record<string, unknown | null>;
}>;

/** Body shape for `PATCH <route>/resource.json` — see `PatchResourceJson.schema.ts`. */
type ColumnPatch = Partial<{
  label: string;
  column: string;
  hiddenInTable: boolean;
  hiddenInForm: boolean;
  hiddenInView: boolean;
  fieldInput: FieldVariantPatch;
  fieldView: FieldVariantPatch;
  fieldTable: FieldVariantPatch;
}>;

type Tab = 'form' | 'view' | 'table';
const TABS: { key: Tab; label: string }[] = [
  { key: 'form', label: 'Form' },
  { key: 'view', label: 'View' },
  { key: 'table', label: 'Table' },
];

const crouton = useCrouton();

const remote = computedAsync(async () => {
  const res = await useApi().get(`${props.formId}/resource-columns`);
  return res.data as { id: string; route: string; columns: EditableColumn[] };
});

/** Local editable copy of the flat fields — the fetched payload is never mutated directly. */
const columns = ref<EditableColumn[]>([]);

const expandedId = ref<string | null>(null);
const activeTab = ref<Tab>('form');

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id;
  activeTab.value = 'form';
};

// ── Per-column, per-context drafts ─────────────────────────────────────────

/**
 * `displayKey`/`colspan`/`position` get dedicated inputs since they're the
 * options every relation/layout control already understands; anything else
 * in `options` (e.g. a `display` mode, `sort`, custom renderer options) is
 * edited as raw JSON so the editor never silently drops an option it
 * doesn't have a first-class control for.
 */
type VariantDraft = {
  position?: number;
  displayKey: string;
  colspan?: number;
  rawOptionsJson: string;
  rawOptionsError: string | null;
};

const drafts = reactive<Record<string, Record<Tab, VariantDraft>>>({});

const FIRST_CLASS_OPTION_KEYS = ['displayKey', 'colspan'];

const toDraft = (variant: FieldVariant | undefined): VariantDraft => {
  const options = (variant?.options ?? {}) as Record<string, unknown>;
  const rest = Object.fromEntries(
    Object.entries(options).filter(
      ([k]) => !FIRST_CLASS_OPTION_KEYS.includes(k),
    ),
  );
  return {
    position: variant?.position,
    displayKey: (options['displayKey'] as string | undefined) ?? '',
    colspan: options['colspan'] as number | undefined,
    rawOptionsJson: Object.keys(rest).length
      ? JSON.stringify(rest, null, 2)
      : '',
    rawOptionsError: null,
  };
};

watch(
  remote,
  (data) => {
    if (!data) return;
    columns.value = data.columns.map((c) => ({ ...c }));
    for (const col of data.columns) {
      drafts[col.id] = {
        form: toDraft(col.form),
        view: toDraft(col.view.resolved),
        table: toDraft(col.table.resolved),
      };
    }
  },
  { immediate: true },
);

const validateRawJson = (draft: VariantDraft) => {
  try {
    if (draft.rawOptionsJson.trim()) JSON.parse(draft.rawOptionsJson);
    draft.rawOptionsError = null;
  } catch {
    draft.rawOptionsError = 'Invalid JSON — fix or clear this before saving.';
  }
};

/**
 * Clears a first-class field back to "no local value". Combined with the
 * diffing in `buildVariantPatch`, this is what sends `null` for that key —
 * on the Form tab that clears a previously-set override outright; on
 * View/Table it's a "reset to inherited" (the value falls back to the level
 * below again instead of staying pinned here).
 */
const resetField = (
  draft: VariantDraft,
  field: 'position' | 'displayKey' | 'colspan',
) => {
  if (field === 'displayKey') draft.displayKey = '';
  else draft[field] = undefined;
};

const saving = ref(false);
const saveError = ref<string | null>(null);

const onCancel = () => emits('closeModal');

const hasRawJsonErrors = computed(() =>
  Object.values(drafts).some((tabs) =>
    TABS.some(({ key }) => tabs[key]?.rawOptionsError),
  ),
);

const jsonEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Builds a `{ position?, options? }` patch for one variant by diffing the
 * draft against the value originally fetched for that context — not the
 * whole resolved object, so untouched keys are never re-written and keep
 * cascading through `fieldInput → fieldView → fieldTable` on their own.
 * Returns `undefined` when nothing changed at this level.
 */
const buildVariantPatch = (
  draft: VariantDraft,
  original: FieldVariant | undefined,
): FieldVariantPatch | undefined => {
  let rest: Record<string, unknown> = {};
  try {
    rest = draft.rawOptionsJson.trim() ? JSON.parse(draft.rawOptionsJson) : {};
  } catch {
    return undefined; // caller blocks the save entirely when any draft has invalid JSON
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
  if (Object.keys(optionsPatch).length) patch.options = optionsPatch;

  return Object.keys(patch).length ? patch : undefined;
};

/** Diffs the edited columns (flat fields + all three variants) against the last-fetched values — only changed fields are sent. */
const buildPatch = (): Record<string, ColumnPatch> => {
  const originalById = new Map(
    (remote.value?.columns ?? []).map((c) => [c.id, c]),
  );
  const patch: Record<string, ColumnPatch> = {};

  for (const col of columns.value) {
    const orig = originalById.get(col.id);
    if (!orig) continue;

    const fieldPatch: ColumnPatch = {};
    if (col.label !== orig.label) fieldPatch.label = col.label;
    if (col.column !== orig.column) fieldPatch.column = col.column;
    if (col.hiddenInTable !== orig.hiddenInTable)
      fieldPatch.hiddenInTable = col.hiddenInTable;
    if (col.hiddenInForm !== orig.hiddenInForm)
      fieldPatch.hiddenInForm = col.hiddenInForm;
    if (col.hiddenInView !== orig.hiddenInView)
      fieldPatch.hiddenInView = col.hiddenInView;

    const d = drafts[col.id];
    if (d) {
      const formPatch = buildVariantPatch(d.form, orig.form);
      const viewPatch = buildVariantPatch(d.view, orig.view.resolved);
      const tablePatch = buildVariantPatch(d.table, orig.table.resolved);
      if (formPatch) fieldPatch.fieldInput = formPatch;
      if (viewPatch) fieldPatch.fieldView = viewPatch;
      if (tablePatch) fieldPatch.fieldTable = tablePatch;
    }

    if (Object.keys(fieldPatch).length) patch[col.id] = fieldPatch;
  }

  return patch;
};

const onSave = async () => {
  if (hasRawJsonErrors.value) {
    saveError.value = 'Fix the invalid JSON before saving.';
    return;
  }

  const patch = buildPatch();
  if (!Object.keys(patch).length) {
    emits('closeModal');
    return;
  }

  saving.value = true;
  saveError.value = null;
  try {
    await useApi().patch(`${props.formId}/resource.json`, { columns: patch });
    // ResourceTable's cached FormDef must be dropped so the table/form/view
    // layout picks up the new values live.
    crouton.invalidateFormDef(props.formId);
    emits('saved');
    emits('closeModal');
  } catch (e: unknown) {
    const message =
      (e as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? 'Failed to save changes.';
    saveError.value = Array.isArray(message) ? message.join(', ') : message;
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <Modal
    :modal-title="`Edit fields — ${formId}`"
    :open="true"
    :disable-close="false"
    width="xl"
    @close-modal="onCancel"
  >
    <template #title>
      <span class="text-xl font-bold">Edit fields — {{ formId }}</span>
    </template>
    <template #content>
      <div v-if="!remote" class="p-4 text-sm opacity-60">Loading…</div>
      <template v-else>
        <div class="alert alert-warning mb-4 text-sm">
          Edits here write directly to <code>resource.json</code>. If
          <code>crouton update resources</code> runs from the CLI at the same
          time, whichever save happens last wins — there's no conflict detection
          yet.
        </div>
        <div v-if="saveError" class="alert alert-error mb-4 text-sm">
          {{ saveError }}
        </div>
      </template>
      <table v-if="remote" class="table w-full">
        <thead>
          <tr>
            <th />
            <th>Label</th>
            <th>Column</th>
            <th>Hidden in table</th>
            <th>Hidden in form</th>
            <th>Hidden in view</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="col in columns" :key="col.id">
            <tr>
              <td>
                <Btn
                  :icon="
                    expandedId === col.id
                      ? IconEnum.ChevronUp
                      : IconEnum.ChevronDown
                  "
                  color="secondary"
                  :outline="true"
                  size="sm"
                  @click="toggleExpand(col.id)"
                />
              </td>
              <td>
                <input
                  v-model="col.label"
                  type="text"
                  class="input input-bordered input-sm w-full"
                />
              </td>
              <td>
                <input
                  v-model="col.column"
                  type="text"
                  class="input input-bordered input-sm w-full"
                />
              </td>
              <td class="text-center">
                <input
                  v-model="col.hiddenInTable"
                  type="checkbox"
                  class="checkbox checkbox-sm"
                />
              </td>
              <td class="text-center">
                <input
                  v-model="col.hiddenInForm"
                  type="checkbox"
                  class="checkbox checkbox-sm"
                />
              </td>
              <td class="text-center">
                <input
                  v-model="col.hiddenInView"
                  type="checkbox"
                  class="checkbox checkbox-sm"
                />
              </td>
            </tr>
            <tr v-if="expandedId === col.id">
              <td colspan="6" class="bg-base-200">
                <div class="p-3 flex flex-col gap-3" v-if="drafts[col.id]">
                  <div class="tabs tabs-boxed w-fit">
                    <a
                      v-for="tab in TABS"
                      :key="tab.key"
                      class="tab"
                      :class="{ 'tab-active': activeTab === tab.key }"
                      @click="activeTab = tab.key"
                    >
                      {{ tab.label }}
                      <span
                        v-if="tab.key === 'view' && col.view.hasOverride"
                        class="badge badge-xs ml-1"
                      />
                      <span
                        v-if="tab.key === 'table' && col.table.hasOverride"
                        class="badge badge-xs ml-1"
                      />
                    </a>
                  </div>

                  <p class="text-xs opacity-60">
                    <template v-if="activeTab === 'form'">
                      Base config used to render the create/edit form. View and
                      Table fall back to this unless they override it.
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
                      <div class="flex gap-1">
                        <input
                          v-model="drafts[col.id][activeTab].displayKey"
                          type="text"
                          placeholder="e.g. name"
                          class="input input-bordered input-sm w-full"
                        />
                        <Btn
                          v-if="activeTab !== 'form'"
                          color="secondary"
                          :outline="true"
                          size="sm"
                          title="Reset to inherited"
                          @click="
                            resetField(drafts[col.id][activeTab], 'displayKey')
                          "
                        >
                          ×
                        </Btn>
                      </div>
                    </label>

                    <label class="form-control">
                      <span class="label-text text-xs">Position</span>
                      <div class="flex gap-1">
                        <input
                          v-model.number="drafts[col.id][activeTab].position"
                          type="number"
                          class="input input-bordered input-sm w-full"
                        />
                        <Btn
                          v-if="activeTab !== 'form'"
                          color="secondary"
                          :outline="true"
                          size="sm"
                          title="Reset to inherited"
                          @click="
                            resetField(drafts[col.id][activeTab], 'position')
                          "
                        >
                          ×
                        </Btn>
                      </div>
                    </label>

                    <label v-if="activeTab !== 'table'" class="form-control">
                      <span class="label-text text-xs">Colspan</span>
                      <div class="flex gap-1">
                        <input
                          v-model.number="drafts[col.id][activeTab].colspan"
                          type="number"
                          min="1"
                          max="4"
                          class="input input-bordered input-sm w-full"
                        />
                        <Btn
                          v-if="activeTab !== 'form'"
                          color="secondary"
                          :outline="true"
                          size="sm"
                          title="Reset to inherited"
                          @click="
                            resetField(drafts[col.id][activeTab], 'colspan')
                          "
                        >
                          ×
                        </Btn>
                      </div>
                    </label>
                  </div>

                  <label class="form-control max-w-2xl">
                    <span class="label-text text-xs">
                      Other options (raw JSON — e.g. <code>display</code>,
                      <code>sort</code>). Set a key to <code>null</code> to
                      reset it back to the inherited value.
                    </span>
                    <textarea
                      v-model="drafts[col.id][activeTab].rawOptionsJson"
                      rows="4"
                      class="textarea textarea-bordered textarea-sm font-mono text-xs w-full"
                      @blur="validateRawJson(drafts[col.id][activeTab])"
                    />
                    <span
                      v-if="drafts[col.id][activeTab].rawOptionsError"
                      class="text-error text-xs mt-1"
                    >
                      {{ drafts[col.id][activeTab].rawOptionsError }}
                    </span>
                  </label>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </template>
    <template #actions>
      <Btn
        color="secondary"
        :outline="true"
        :disabled="saving"
        @click="onCancel"
      >
        Cancel
      </Btn>
      <Btn :disabled="saving" @click="onSave">
        {{ saving ? 'Saving…' : 'Save' }}
      </Btn>
    </template>
  </Modal>
</template>
