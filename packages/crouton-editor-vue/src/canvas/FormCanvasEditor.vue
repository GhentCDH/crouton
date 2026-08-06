<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import draggable from 'vuedraggable';

import { Btn } from '@ghentcdh/ui';

import { FormCanvasEditorProperties } from './FormCanvasEditor.properties';
import { type CanvasField, buildCanvasLayout } from './canvas-layout';
import { swapOptionsFor } from './type-swaps';
import type { CanvasSelectOption } from './FormFieldCard.properties';
import FormFieldCard from './FormFieldCard.vue';
import { COLSPAN } from '@ghentcdh/crouton-forms-vue';

const props = defineProps(FormCanvasEditorProperties);

const layout = computed(() => buildCanvasLayout(props.columns, props.drafts));

/**
 * Local, reorderable copy of the visible fields for `vuedraggable`'s
 * v-model. Re-synced whenever the underlying draft state changes (including
 * right after this same component writes new positions on drag-end — that
 * recompute reproduces the same order, so it's a no-op re-sync, not a loop).
 */
const orderedFields = ref<CanvasField[]>([]);
watch(
  layout,
  (l) => {
    orderedFields.value = [...l.fields];
  },
  { immediate: true },
);

const gridRoot = ref<InstanceType<typeof draggable> | null>(null);
const gridEl = computed<HTMLElement | null>(
  () => (gridRoot.value as unknown as { $el?: HTMLElement })?.$el ?? null,
);

/** Rewrites `position` for every visible field to match the just-dropped order (simple 0..n-1 renumbering). */
const onDragEnd = () => {
  orderedFields.value.forEach((field, index) => {
    const d = props.drafts[field.id];
    if (d) d.form.position = index;
  });
};

const onColspanUpdate = (fieldId: string, colspan: number) => {
  const d = props.drafts[fieldId];
  if (d) d.form.colspan = colspan;
};

const onChangeType = (fieldId: string, type: string) => {
  const d = props.drafts[fieldId];
  if (d) d.form.type = type;
};

const lastRemoved = ref<{ id: string; label: string } | null>(null);

const onRemove = (fieldId: string) => {
  const col = props.columns.find((c) => c.id === fieldId);
  if (!col) return;
  col.hiddenInForm = true;
  lastRemoved.value = { id: fieldId, label: col.label || col.column };
};

const undoRemove = () => {
  if (!lastRemoved.value) return;
  const col = props.columns.find((c) => c.id === lastRemoved.value?.id);
  if (col) col.hiddenInForm = false;
  lastRemoved.value = null;
};

const showAddMenu = ref(false);
const addMenuRoot = ref<HTMLElement | null>(null);

// Same daisyUI 5 quirk as FormFieldCard's "..." menu: `.dropdown-content`
// only shows via a `dropdown-open` class or native :focus-within, so a
// manual v-if with no class binding can leave the menu invisible, and once
// shown via the class it no longer auto-closes on blur — a document click
// listener has to do that instead.
const onDocumentClick = (event: MouseEvent) => {
  if (!showAddMenu.value) return;
  const target = event.target as Node | null;
  if (addMenuRoot.value && target && !addMenuRoot.value.contains(target)) {
    showAddMenu.value = false;
  }
};

watch(showAddMenu, (open) => {
  if (open) document.addEventListener('click', onDocumentClick);
  else document.removeEventListener('click', onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
});

const onAddField = (fieldId: string) => {
  showAddMenu.value = false;
  const col = props.columns.find((c) => c.id === fieldId);
  if (!col) return;
  col.hiddenInForm = false;
  const maxPosition = layout.value.fields.reduce(
    (max, f) => Math.max(max, f.position),
    -1,
  );
  const d = props.drafts[fieldId];
  if (d) d.form.position = maxPosition + 1;
};

/** `options.options`/`options.values` off the column's original Form config, for select/mutliSelect preview rendering. */
const selectOptionsFor = (fieldId: string): CanvasSelectOption[] => {
  const col = props.columns.find((c) => c.id === fieldId);
  const options = col?.form?.options as Record<string, unknown> | undefined;
  const raw = options?.['options'] ?? options?.['values'];
  if (!Array.isArray(raw)) return [];
  return raw.map((o) =>
    o && typeof o === 'object' && 'label' in (o as Record<string, unknown>)
      ? (o as CanvasSelectOption)
      : { label: String(o), value: o },
  );
};
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="alert alert-warning text-sm">
      <span>
        <strong>Visual mode is still in development</strong> — drag, resize,
        change-type, and add/remove are new and less battle-tested than the
        Table view. Switch back to Table if something looks wrong.
      </span>
    </div>

    <div
      v-if="lastRemoved"
      class="alert flex items-center justify-between text-sm"
    >
      <span>Removed “{{ lastRemoved.label }}” from the form.</span>
      <Btn color="secondary" :outline="true" size="xs" @click="undoRemove">
        Undo
      </Btn>
    </div>

    <p v-if="!orderedFields.length" class="text-sm opacity-60">
      No standard fields to lay out yet — add one below, or edit relation fields
      in the Table view.
    </p>

    <draggable
      ref="gridRoot"
      v-model="orderedFields"
      item-key="id"
      handle=".drag-handle"
      tag="div"
      class="grid grid-cols-1 gap-3 md:grid-cols-12"
      @end="onDragEnd"
    >
      <template #item="{ element }: { element: CanvasField }">
        <div :class="COLSPAN[element.colspan] ?? COLSPAN[12]">
          <FormFieldCard
            :field="element"
            :type-options="swapOptionsFor(element.type)"
            :select-options="selectOptionsFor(element.id)"
            :grid-el="gridEl"
            @update:colspan="(n) => onColspanUpdate(element.id, n)"
            @change-type="(t) => onChangeType(element.id, t)"
            @remove="onRemove(element.id)"
          />
        </div>
      </template>
    </draggable>

    <p v-if="layout.excludedCount" class="text-xs opacity-60">
      {{ layout.excludedCount }} field(s) not shown here (relations or a type
      Visual mode doesn't support yet) — edit them in Table view.
    </p>

    <div
      ref="addMenuRoot"
      class="dropdown"
      :class="{ 'dropdown-open': showAddMenu }"
    >
      <Btn
        tabindex="0"
        color="secondary"
        :outline="true"
        size="sm"
        :disabled="!layout.hiddenFields.length"
        @click="showAddMenu = !showAddMenu"
      >
        + Add field
      </Btn>
      <ul
        v-if="showAddMenu && layout.hiddenFields.length"
        tabindex="0"
        class="dropdown-content menu menu-sm bg-base-100 rounded-box shadow-md border border-base-300 z-10 w-56 p-1"
      >
        <li v-for="hidden in layout.hiddenFields" :key="hidden.id">
          <a @click="onAddField(hidden.id)">{{ hidden.label }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>
