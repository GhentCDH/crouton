import {
  type FieldInput,
  type JsonColumn,
  resolveTableField,
  resolveViewField,
} from '@ghentcdh/crouton-core';

import { type Resource } from '../resource/ResourceConfig.schema';

// ── crouton-api only ──────────────────────────────────────────────────────

/**
 * A rendering-context's field config as exposed to the visual builder: the
 * resolved value (fieldInput) plus whether this column has its own override
 * at this level. `hasOverride: false` means saving with no changes here should
 * leave it that way rather than pinning a copy into `fieldInput`.
 */
export type EditableFieldVariant = {
  resolved: FieldInput | undefined;
  hasOverride: boolean;
};

export type EditableColumn = {
  id: string;
  label?: string;
  column: string;
  hiddenInTable: boolean;
  hiddenInForm: boolean;
  hiddenInView: boolean;
  /** The base level — always "owned" by this column, no fallback/override distinction. */
  form: FieldInput | undefined;
  view: EditableFieldVariant;
  table: EditableFieldVariant;
};

/**
 * Build the payload for `GET /resource-columns` — the raw, editable column
 * list backing the visual resource builder (dev-mode only). Unlike
 * `buildResourceJsonPayload`/`buildViewsPayload`, which expose columns only
 * as compiled JSON Schema + JSONForms UI Schema, this returns the plain
 * per-column attributes the editor lets a developer change directly, split
 * per rendering context (form/view/table) so the editor can offer a tab per
 * context instead of one flat fieldInput-only row.
 *
 * `config.columns` is typed as the pre-normalization map form on `Resource`
 * (inherited from `ResourceJsonShape`), but at runtime it always holds the
 * post-`ResourceJsonSchema`-transform array form (`JsonColumn[]`) — the same
 * assumption other adapter code in this package already relies on.
 */
export const buildEditableColumnsPayload = (
  config: Resource,
): {
  id: string;
  route: string;
  columns: EditableColumn[];
} => {
  const columns = (config.columns as unknown as JsonColumn[] | undefined) ?? [];

  return {
    id: config.name,
    route: config.route,
    columns: columns.map((c) => ({
      id: c.id,
      label: c.label,
      column: c.column ?? c.id,
      hiddenInTable: c.hiddenInTable,
      hiddenInForm: c.hiddenInForm,
      hiddenInView: c.hiddenInView,
      form: c.fieldInput,
      view: { resolved: resolveViewField(c), hasOverride: false },
      table: { resolved: resolveTableField(c), hasOverride: false },
    })),
  };
};
