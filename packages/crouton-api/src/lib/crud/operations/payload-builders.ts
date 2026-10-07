import {
  type FieldInput,
  type JsonColumn,
  resolveTableField,
  resolveViewField,
} from '@ghentcdh/crouton-core';
import {
  buildDefinitionPayload as _buildDefinitionPayload,
  buildResourceJsonPayload as _buildResourceJsonPayload,
  buildResourceOperations,
  buildSubResourceViewsPayload as _buildSubResourceViewsPayload,
  buildViewsPayload as _buildViewsPayload,
  resolveActions as _resolveActions,
  resolveTableActions as _resolveTableActions,
} from '@ghentcdh/crouton-core';

import type { ResourceRowAction, ResourceTableAction } from '../action';
import { type Resource } from '../resource/ResourceConfig.schema';
import type { SubResourceConfig } from '../resource/SubResource.schema';

export { buildResourceOperations };

// Typed wrappers so callers pass Resource/ResourceRowAction instead of the
// crouton-core CompiledResource/JsonAction types (structurally compatible at
// runtime; `as any` is contained to this boundary).

export const resolveActions = (
  baseUrl: string,
  actions: ResourceRowAction[] | undefined,
) => _resolveActions(baseUrl, actions as any);

export const resolveTableActions = (
  baseUrl: string,
  actions: ResourceTableAction[] | undefined,
) => _resolveTableActions(baseUrl, actions as any);

export const buildDefinitionPayload = (
  config: Resource,
): Record<string, unknown> => _buildDefinitionPayload(config as any);

export const buildResourceJsonPayload = (
  config: Resource,
  baseUrl?: string,
): Record<string, unknown> => _buildResourceJsonPayload(config as any, baseUrl);

export const buildViewsPayload = (
  config: Resource,
  baseUrl?: string,
): Record<string, unknown> | undefined => _buildViewsPayload(config as any, baseUrl);

export const buildSubResourceViewsPayload = (
  config: Resource,
  sub: SubResourceConfig,
  baseUrl?: string,
): Record<string, unknown> | undefined =>
  _buildSubResourceViewsPayload(config as any, sub as any, baseUrl);

// ── crouton-api only ──────────────────────────────────────────────────────

/**
 * A rendering-context's field config as exposed to the visual builder: the
 * resolved value (walking the `fieldInput → fieldView → fieldTable` fallback
 * chain, via crouton-core's `resolveViewField`/`resolveTableField` — so the
 * editor shows what will actually render) plus whether this column has its
 * own override at this level. `hasOverride: false` means the value shown is
 * pure inheritance from the level below; saving with no changes here should
 * leave it that way rather than pinning a copy into `fieldView`/`fieldTable`.
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
      view: { resolved: resolveViewField(c), hasOverride: c.fieldView != null },
      table: {
        resolved: resolveTableField(c),
        hasOverride: c.fieldTable != null,
      },
    })),
  };
};
