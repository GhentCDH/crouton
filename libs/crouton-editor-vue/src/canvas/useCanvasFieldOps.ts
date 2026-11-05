import { computed, ref, watch } from 'vue';

import type { CanvasSelectOption } from './FieldPreview.properties';
import { type CanvasField, buildCanvasLayout } from './canvas-layout';
import { swapOptionsFor } from './type-swaps';
import {
  type EditableColumn,
  HIDDEN_FLAG,
  type Tab,
  type VariantDraft,
} from '../types/resource-schema-editor.types';

export type CanvasFieldOpsOptions = {
  supportsColspan?: boolean;
};

export const useCanvasFieldOps = (
  props: {
    columns: EditableColumn[];
    drafts: Record<string, Record<Tab, VariantDraft>>;
  },
  ctx: Tab,
  opts: CanvasFieldOpsOptions = {},
) => {
  const { supportsColspan = true } = opts;

  const layout = computed(() => buildCanvasLayout(props.columns, props.drafts, ctx));

  const orderedFields = ref<CanvasField[]>([]);
  watch(
    layout,
    (l) => {
      orderedFields.value = [...l.fields];
    },
    { immediate: true },
  );

  const hiddenFlag = HIDDEN_FLAG[ctx];

  const onDragEnd = () => {
    orderedFields.value.forEach((field, index) => {
      const d = props.drafts[field.id];
      if (d) d[ctx].position = index;
    });
  };

  const onColspanUpdate = supportsColspan
    ? (fieldId: string, colspan: number) => {
        const d = props.drafts[fieldId];
        if (d) d[ctx].colspan = colspan;
      }
    : undefined;

  const onChangeType = (fieldId: string, type: string) => {
    const d = props.drafts[fieldId];
    if (d) d[ctx].type = type;
  };

  const lastRemoved = ref<{ id: string; label: string } | null>(null);

  const onRemove = (fieldId: string) => {
    const col = props.columns.find((c) => c.id === fieldId);
    if (!col) return;
    col[hiddenFlag] = true;
    lastRemoved.value = { id: fieldId, label: col.label || col.column };
  };

  const undoRemove = () => {
    if (!lastRemoved.value) return;
    const col = props.columns.find((c) => c.id === lastRemoved.value?.id);
    if (col) col[hiddenFlag] = false;
    lastRemoved.value = null;
  };

  const onAddField = (fieldId: string) => {
    const col = props.columns.find((c) => c.id === fieldId);
    if (!col) return;
    col[hiddenFlag] = false;
    const maxPosition = layout.value.fields.reduce(
      (max, f) => Math.max(max, f.position),
      -1,
    );
    const d = props.drafts[fieldId];
    if (d) d[ctx].position = maxPosition + 1;
  };

  const selectOptionsFor = (fieldId: string): CanvasSelectOption[] => {
    const col = props.columns.find((c) => c.id === fieldId);
    const formConfig = ctx === 'form' ? col?.form : col?.[ctx]?.resolved;
    const options = formConfig?.options as Record<string, unknown> | undefined;
    const raw = options?.['options'] ?? options?.['values'];
    if (!Array.isArray(raw)) return [];
    return raw.map((o) =>
      o && typeof o === 'object' && 'label' in (o as Record<string, unknown>)
        ? (o as CanvasSelectOption)
        : { label: String(o), value: o },
    );
  };

  const typeOptionsFor = (type: string) => swapOptionsFor(type);

  return {
    layout,
    orderedFields,
    onDragEnd,
    onColspanUpdate,
    onChangeType,
    onRemove,
    lastRemoved,
    undoRemove,
    onAddField,
    selectOptionsFor,
    typeOptionsFor,
  };
};