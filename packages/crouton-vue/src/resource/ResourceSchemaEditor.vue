<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { Btn, Checkbox, IconEnum, Input, Modal } from '@ghentcdh/ui';

import { computedAsync } from '../utils/computedAsync';
import { useApi } from '../composables/useApi';
import { useCrouton } from '../composables/useCrouton';
import ResourceFieldVariantEditor from './ResourceFieldVariantEditor.vue';
import { ResourceSchemaEditorProperties } from './ResourceSchemaEditor.properties';
import {
  type ColumnPatch,
  type EditableColumn,
  type FieldVariant,
  type FieldVariantPatch,
  TABS,
  type Tab,
  toDraft,
  type VariantDraft,
  visibleTabs,
} from './resource-schema-editor.types';

const props = defineProps(ResourceSchemaEditorProperties);

const emits = defineEmits<{
  closeModal: [];
  /** Emitted after a successful save, so ResourceTable can refetch its config. */
  saved: [];
}>();

const crouton = useCrouton();

const remote = computedAsync(async () => {
  const res = await useApi().get(`${props.formId}/resource-columns`);
  return res.data as { id: string; route: string; columns: EditableColumn[] };
});

/** Local editable copy of the flat fields — the fetched payload is never mutated directly. */
const columns = ref<EditableColumn[]>([]);

const expandedId = ref<string | null>(null);
const activeTab = ref<Tab>('form');

const toggleExpand = (col: EditableColumn) => {
  if (expandedId.value === col.id) {
    expandedId.value = null;
    return;
  }
  expandedId.value = col.id;
  activeTab.value = visibleTabs(col)[0]?.key ?? 'form';
};

/**
 * Keeps `activeTab` valid as hiddenInForm/View/Table are toggled on the
 * expanded column — e.g. ticking "hidden in view" while the View tab is open
 * moves the selection to whatever tab is still visible instead of leaving it
 * pointed at a tab that just disappeared from the bar.
 */
watch(
  () => {
    const col = columns.value.find((c) => c.id === expandedId.value);
    return col ? visibleTabs(col).map((t) => t.key) : [];
  },
  (keys) => {
    if (keys.length && !keys.includes(activeTab.value)) {
      activeTab.value = keys[0];
    }
  },
);

// ── Per-column, per-context drafts ─────────────────────────────────────────

const drafts = reactive<Record<string, Record<Tab, VariantDraft>>>({});

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
      <!--
        Modal's own content slot has no overflow/height handling (a plain
        <p> between the title and actions) — this wraps it in a bounded,
        scrollable region so a resource with many columns (each expandable
        into a Form/View/Table panel) doesn't just overflow the modal
        silently. Matches the wrapping ViewModal.vue/FormModal.vue already
        do around their own #content.
      -->
      <div class="max-h-[65vh] overflow-y-auto pr-1">
        <div v-if="!remote" class="p-4 text-sm opacity-60">Loading…</div>
        <template v-else>
          <div class="alert alert-warning mb-4 text-sm">
            Edits here write directly to <code>resource.json</code>. If
            <code>crouton update resources</code> runs from the CLI at the same
            time, whichever save happens last wins — there's no conflict
            detection yet.
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
                    @click="toggleExpand(col)"
                  />
                </td>
                <td>
                  <Input v-model="col.label" size="sm" />
                </td>
                <td>
                  <Input v-model="col.column" size="sm" />
                </td>
                <td class="text-center">
                  <Checkbox v-model="col.hiddenInTable" />
                </td>
                <td class="text-center">
                  <Checkbox v-model="col.hiddenInForm" />
                </td>
                <td class="text-center">
                  <Checkbox v-model="col.hiddenInView" />
                </td>
              </tr>
              <tr v-if="expandedId === col.id">
                <td colspan="6" class="bg-base-200">
                  <ResourceFieldVariantEditor
                    v-if="drafts[col.id]"
                    :col="col"
                    :drafts="drafts[col.id]"
                    v-model:active-tab="activeTab"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
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
