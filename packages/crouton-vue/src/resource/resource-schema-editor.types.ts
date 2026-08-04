/**
 * Shared types/constants between `ResourceSchemaEditor.vue` (the column list +
 * save/patch logic) and `ResourceFieldVariantEditor.vue` (the per-column
 * Form/View/Table field configuration panel it expands into).
 */

/** Mirrors crouton-core's `FieldInput` shape closely enough for editing. */
export type FieldVariant = {
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
export type EditableFieldVariant = {
  resolved?: FieldVariant;
  hasOverride: boolean;
};

export type EditableColumn = {
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

export type Tab = 'form' | 'view' | 'table';

export const TABS: { key: Tab; label: string }[] = [
  { key: 'form', label: 'Form' },
  { key: 'view', label: 'View' },
  { key: 'table', label: 'Table' },
];

/** Which flat visibility flag hides each tab's context entirely. */
export const HIDDEN_FLAG: Record<
  Tab,
  'hiddenInForm' | 'hiddenInView' | 'hiddenInTable'
> = {
  form: 'hiddenInForm',
  view: 'hiddenInView',
  table: 'hiddenInTable',
};

/**
 * A hidden context has nothing to render, so there's nothing useful to edit
 * there — its tab is hidden rather than shown empty/disabled.
 */
export const visibleTabs = (
  col: EditableColumn,
): { key: Tab; label: string }[] =>
  TABS.filter((t) => !col[HIDDEN_FLAG[t.key]]);

/** `0`–`11` show as-is; `12` (the schema default) reads as "Full" width. */
export const COLSPAN_OPTIONS = Array.from({ length: 13 }, (_, i) => i);
export const colspanLabel = (n: number): string =>
  n === 12 ? 'Full' : String(n);

/**
 * `displayKey`/`colspan`/`position` get dedicated inputs since they're the
 * options every relation/layout control already understands; anything else
 * in `options` (e.g. a `display` mode, `sort`, custom renderer options) is
 * edited as raw JSON so the editor never silently drops an option it
 * doesn't have a first-class control for.
 */
export type VariantDraft = {
  position?: number;
  displayKey: string;
  colspan?: number;
  rawOptionsJson: string;
  rawOptionsError: string | null;
};

export const FIRST_CLASS_OPTION_KEYS = ['displayKey', 'colspan'];

export const toDraft = (variant: FieldVariant | undefined): VariantDraft => {
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

/** Body shape for one variant patch — see `PatchResourceJson.schema.ts`. */
export type FieldVariantPatch = Partial<{
  position: number | null;
  options: Record<string, unknown | null>;
}>;

/** Body shape for `PATCH <route>/resource.json` — see `PatchResourceJson.schema.ts`. */
export type ColumnPatch = Partial<{
  label: string;
  column: string;
  hiddenInTable: boolean;
  hiddenInForm: boolean;
  hiddenInView: boolean;
  fieldInput: FieldVariantPatch;
  fieldView: FieldVariantPatch;
  fieldTable: FieldVariantPatch;
}>;
