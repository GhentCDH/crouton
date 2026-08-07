/**
 * Type-compatibility matrix for the "change display type" menu on the
 * visual form canvas (`LIVE_FORM_EDITOR_PLAN.md` Phase 0/4).
 *
 * The value that actually drives control selection for a *standard*
 * (non-relation) column is `fieldInput.type` — confirmed by reading
 * `crouton-api`'s `form-schema.builder.ts` (`buildFormControl`): its default
 * branch does `const type = fieldInput?.type ?? 'text'; control.control(type, options)`,
 * which becomes the ui schema's `options.format` the renderer testers key off
 * (`crouton-forms-vue/src/testers/tester.ts`). `fieldInput.format` itself is
 * reserved for the special-cased branches (`'relation'`, `'date-range'`) and
 * isn't part of this swap set at all.
 *
 * Only "same-shape" swaps are offered here — ones that don't change the
 * underlying JSON Schema `type` of the column's data, just how it's
 * presented:
 * - string family: all backed by a JSON Schema `string` (`string`/`text`/
 *   `undefined` all mean plain text; `textarea`; `markdown`).
 * - number family: `number` vs `Integer` (both backed by a numeric JSON
 *   Schema type already fixed by the underlying Prisma column — switching
 *   between them only changes which renderer/formatting is used, not the
 *   schema type).
 *
 * Deliberately excluded from v1 (see `LIVE_FORM_EDITOR_PLAN.md` open
 * decisions 2):
 * - `select ↔ mutliSelect` — changes the data shape from scalar to array,
 *   not just a display hint; needs its own confirmation flow and possibly a
 *   `Column.ts` schema change, not a silent swap.
 * - `boolean` — no safe swap partner in the standard set.
 * - `date`/`dateTime` — no confirmed first-class renderer wiring found for
 *   these outside the relation-adjacent `date-range`; parked rather than
 *   guessed at.
 */

export type CanvasTypeOption = { value: string; label: string };

const STRING_FAMILY: CanvasTypeOption[] = [
  { value: 'string', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'markdown', label: 'Markdown' },
];

const NUMBER_FAMILY: CanvasTypeOption[] = [
  { value: 'number', label: 'Number' },
  { value: 'Integer', label: 'Integer' },
];

/** Normalizes the handful of values that all mean "plain text" to one canonical key. */
export const normalizeCanvasType = (type: string | undefined): string => {
  if (type === undefined || type === 'text') return 'string';
  return type;
};

/**
 * Same-shape swap options for a column currently using `type` — always
 * includes `type` itself (already normalized) so the current value has a
 * matching entry in the menu. Returns an empty array when there's no safe
 * swap partner (boolean, select/mutliSelect, date family, anything else).
 */
export const swapOptionsFor = (
  type: string | undefined,
): CanvasTypeOption[] => {
  const normalized = normalizeCanvasType(type);
  if (STRING_FAMILY.some((o) => o.value === normalized)) return STRING_FAMILY;
  if (NUMBER_FAMILY.some((o) => o.value === normalized)) return NUMBER_FAMILY;
  return [];
};

/** Types the canvas knows how to render at all (beyond just offering a swap for). */
export const CANVAS_SUPPORTED_TYPES = new Set<string>([
  'string',
  'textarea',
  'markdown',
  'number',
  'Integer',
  'boolean',
  'select',
  'mutliSelect',
]);

export const isCanvasSupportedType = (type: string | undefined): boolean =>
  CANVAS_SUPPORTED_TYPES.has(normalizeCanvasType(type));
