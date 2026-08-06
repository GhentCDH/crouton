/**
 * Client-side, network-free layout resolution for the visual form canvas
 * (`LIVE_FORM_EDITOR_PLAN.md` Phase 1 / `RESOURCE_JSON_EDITOR_COMPONENT_PLAN.md`
 * Phase 6's first real consumer).
 *
 * This is a deliberately lightweight projection, not a full port of
 * `crouton-api`'s `buildFormUiSchema`/`LayoutBuilder`/`ControlBuilder`. Those
 * build a complete JsonForms `GridLayout` (with visibility rules, relation
 * options, custom renderers, etc.) for full JsonForms dispatch — but the
 * canvas explicitly does NOT go through JsonForms dispatch (see
 * `FormCanvasEditor.vue`'s comment for why: dispatch has no hook for
 * wrapping drag/resize/menu chrome around each control). All the canvas
 * actually needs from "the layout" is: which columns are visible-in-form and
 * non-relation, what order they're in, and each one's effective colspan/type
 * — so that's all this module computes, purely from in-memory state, with no
 * network call.
 */

import { isCanvasSupportedType, normalizeCanvasType } from './type-swaps';
import type {
  EditableColumn,
  Tab,
  VariantDraft,
} from '../types/resource-schema-editor.types';

/** One field as the canvas will render it. */
export type CanvasField = {
  id: string;
  label: string;
  /** Normalized type (`normalizeCanvasType` — 'text'/undefined collapse to 'string'). */
  type: string;
  colspan: number;
  /** Effective sort key — the draft's explicit position, or its position in `columns`. */
  position: number;
};

/**
 * A column is a relation if its original (never-drafted — relation-ness
 * isn't editable here) form config says so. Mirrors `buildFormControl`'s own
 * relation test (`fieldInput?.format === 'relation'`) plus the two other
 * tells a relation column carries even if `format` itself is missing.
 */
export const isRelationColumn = (col: EditableColumn): boolean => {
  const f = col.form;
  return !!(f?.format === 'relation' || f?.resource || f?.relationType);
};

/** Reads the live-edited type for a column's Form context out of its draft. */
export const draftType = (
  drafts: Record<Tab, VariantDraft> | undefined,
): string | undefined => drafts?.form.type;

/** Reads the live-edited colspan for a column's Form context, defaulting to 12 (schema default). */
export const draftColspan = (
  drafts: Record<Tab, VariantDraft> | undefined,
): number => drafts?.form.colspan ?? 12;

/** Reads the live-edited position, falling back to `fallbackIndex` — mirrors `sortByPosition`'s `position ?? arrayIndex`. */
export const draftPosition = (
  drafts: Record<Tab, VariantDraft> | undefined,
  fallbackIndex: number,
): number => drafts?.form.position ?? fallbackIndex;

export type CanvasLayout = {
  /** Visible, non-relation, canvas-supported fields, in effective order. */
  fields: CanvasField[];
  /** Non-relation, canvas-supported columns currently hidden from the form (candidates for "+ Add field"). */
  hiddenFields: { id: string; label: string }[];
  /** Columns excluded because they're relations or a type the canvas doesn't render (date, custom, etc.). */
  excludedCount: number;
};

/**
 * Builds the canvas's view of the current draft state — pure, synchronous,
 * safe to call on every render/drag tick (no network call, no memoization
 * needed for correctness, only worth it for render-perf on a very large
 * resource).
 */
export const buildCanvasLayout = (
  columns: EditableColumn[],
  drafts: Record<string, Record<Tab, VariantDraft>>,
): CanvasLayout => {
  const fields: CanvasField[] = [];
  const hiddenFields: { id: string; label: string }[] = [];
  let excludedCount = 0;

  columns.forEach((col, index) => {
    if (isRelationColumn(col)) {
      excludedCount++;
      return;
    }
    const d = drafts[col.id];
    const type = normalizeCanvasType(draftType(d));
    if (!isCanvasSupportedType(type)) {
      excludedCount++;
      return;
    }

    if (col.hiddenInForm) {
      hiddenFields.push({ id: col.id, label: col.label || col.column });
      return;
    }

    fields.push({
      id: col.id,
      label: col.label || col.column,
      type,
      colspan: draftColspan(d),
      position: draftPosition(d, index),
    });
  });

  fields.sort((a, b) => a.position - b.position);

  return { fields, hiddenFields, excludedCount };
};
