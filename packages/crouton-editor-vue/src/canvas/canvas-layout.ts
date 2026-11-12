/**
 * Client-side, network-free layout resolution for the visual canvas
 * (`LIVE_FORM_EDITOR_PLAN.md` Phase 1 / `TABLE_VIEW_CANVAS_PLAN.md` Phase 1).
 *
 * Parameterized by `ctx: Tab` so Form, View, and Table canvases all share
 * the same layout logic — each context reads its own draft slot and hidden
 * flag, but the computation is identical.
 */

import {
  type EditableColumn,
  HIDDEN_FLAG,
  type Tab,
  type VariantDraft,
} from '../types/resource-schema-editor.types';
import { normalizeCanvasType } from './type-swaps';

/** One field as the canvas will render it. */
export type CanvasField = {
  id: string;
  label: string;
  /** Normalized type (`normalizeCanvasType` — 'text'/undefined collapse to 'string'). */
  type: string;
  /** Grid colspan: full width (12) for form/view, 1 for the flat table row. */
  colspan: number;
};

/**
 * A column is a relation if its config for the given context says so.
 * For `form` we read `col.form`; for `view`/`table` we read `col[ctx].resolved`.
 * Checks `col.relation` (Block 6 schema) first, falls back to legacy fieldInput tells.
 */

/** Reads the live-edited type for a column in the given context out of its draft. */
const draftType = (
  drafts: Record<Tab, VariantDraft> | undefined,
  ctx: Tab = 'form',
): string | undefined => drafts?.[ctx].type;

export type CanvasLayout = {
  /** Visible, non-relation, canvas-supported fields, in effective order. */
  fields: CanvasField[];
  /** Non-relation, canvas-supported columns currently hidden (candidates for "+ Add field"). */
  hiddenFields: { id: string; label: string }[];
};

/**
 * Builds the canvas's view of the current draft state — pure, synchronous,
 * safe to call on every render/drag tick.
 *
 * @param ctx Which context to resolve for — reads `drafts[id][ctx]` and
 *   the matching `hiddenIn*` flag.
 */
export const buildCanvasLayout = (
  columns: EditableColumn[],
  drafts: Record<string, Record<Tab, VariantDraft>>,
  ctx: Tab = 'form',
): CanvasLayout => {
  const hiddenFlag = HIDDEN_FLAG[ctx];
  const fields: CanvasField[] = [];
  const hiddenFields: { id: string; label: string }[] = [];

  columns.forEach((col) => {
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
      // ponytail: order/colspan live in layout.<ctx>.items now; this canvas shows column
      // order at full width and can't edit placement until the new editor lands.
      colspan: ctx === 'table' ? 1 : 12,
    });
  });

  return { fields, hiddenFields };
};