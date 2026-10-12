import {
  type EditableColumn,
  HIDDEN_FLAG,
  type Tab,
  type VariantDraft,
} from './resource-schema-editor.types';
import { normalizeCanvasType } from './type-swaps';

/** One field as the canvas will render it. */
export type CanvasField = {
  id: string;
  label: string;
  /** Normalized type (`normalizeCanvasType` — 'text'/undefined collapse to 'string'). */
  type: string;
  /** Grid colspan (form/view). Omitted for table context (flat array, no grid). */
  colspan: number;
  /** Effective sort key — the draft's explicit position, or its position in `columns`. */
  position: number;
};

/**
 * A column is a relation if its config for the given context says so.
 */
export const isRelationColumn = (col: EditableColumn, ctx: Tab = 'form'): boolean => {
  const f = ctx === 'form' ? col.form : col[ctx]?.resolved;
  return !!(f?.format === 'relation' || f?.resource || f?.relationType);
};

/** Reads the live-edited type for a column in the given context out of its draft. */
export const draftType = (
  drafts: Record<Tab, VariantDraft> | undefined,
  ctx: Tab = 'form',
): string | undefined => drafts?.[ctx].type;

/** Reads the live-edited colspan for a column in the given context, defaulting to 12. */
export const draftColspan = (
  drafts: Record<Tab, VariantDraft> | undefined,
  ctx: Tab = 'form',
): number => drafts?.[ctx].colspan ?? 12;

/** Reads the live-edited position, falling back to `fallbackIndex`. */
export const draftPosition = (
  drafts: Record<Tab, VariantDraft> | undefined,
  fallbackIndex: number,
  ctx: Tab = 'form',
): number => drafts?.[ctx].position ?? fallbackIndex;

export type CanvasLayout = {
  /** Visible, non-relation, canvas-supported fields, in effective order. */
  fields: CanvasField[];
  /** Non-relation, canvas-supported columns currently hidden (candidates for "+ Add field"). */
  hiddenFields: { id: string; label: string }[];
};

/**
 * Builds the canvas's view of the current draft state — pure, synchronous,
 * safe to call on every render/drag tick.
 */
export const buildCanvasLayout = (
  columns: EditableColumn[],
  drafts: Record<string, Record<Tab, VariantDraft>>,
  ctx: Tab = 'form',
): CanvasLayout => {
  const hiddenFlag = HIDDEN_FLAG[ctx];
  const fields: CanvasField[] = [];
  const hiddenFields: { id: string; label: string }[] = [];

  columns.forEach((col, index) => {
    const d = drafts[col.id];
    const type = normalizeCanvasType(draftType(d, ctx));

    if (col[hiddenFlag]) {
      hiddenFields.push({ id: col.id, label: col.label || col.column });
      return;
    }

    fields.push({
      id: col.id,
      label: col.label || col.column,
      type,
      colspan: ctx === 'table' ? 1 : draftColspan(d, ctx),
      position: draftPosition(d, index, ctx),
    });
  });

  fields.sort((a, b) => a.position - b.position);

  return { fields, hiddenFields };
};
