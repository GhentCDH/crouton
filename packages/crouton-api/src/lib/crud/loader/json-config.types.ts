/**
 * Types that mirror the shape of a `resource.json` config file.
 */

import type { RelationType } from '@ghentcdh/crouton-core';
export type { RelationType } from '@ghentcdh/crouton-core';

type BoolOrUpsert = boolean | { upsertOn: string | string[] };

export type JsonOperations = {
  findAll?: boolean;
  findOne?: boolean;
  create?: boolean;
  update?: boolean;
  upsert?: BoolOrUpsert;
  delete?: boolean;
};

/** Describes a nested control inside a `detail`/`detailFixed` array layout. */
export type DetailControl = {
  /** Property name on the array item. */
  property: string;
  /** Control type (e.g. `"text"`, `"markdown"`). Defaults to `"text"`. */
  type?: string;
  options?: Record<string, unknown>;
  hideLabel?: boolean;
  width?: string;
};

/** Configuration for array columns rendered via `detailFixed`. */
export type DetailConfig = {
  /** Layout style: `"collapse"` wraps each item in a collapsible panel. */
  layout: 'collapse' | 'row';
  /** Key on the array item used as the collapse panel title. */
  titleKey?: string;
  /** Nested controls rendered for each array item. */
  controls: DetailControl[];
};


export type FieldInput = {
  type: string;
  /**
   * Render format hint for the frontend (e.g. `"relation"` for sub-resource
   * relations). When `format` is `"relation"`, `resource` must also be set.
   */
  format?: string;
  /**
   * Relative path to the child resource definition, e.g. `"./author.resource"`.
   * Only used when `format` is `"relation"`. Resolved at load time to inject
   * sub-resource URIs into `options`.
   */
  resource?: string;
  /**
   * Cardinality of the relation. Used by the frontend to determine the correct
   * renderer and behaviour (e.g. single-select vs multi-select).
   * - `manyToOne` / `oneToOne`   — single FK reference (autocomplete / relation control)
   * - `oneToMany` / `manyToMany` — collection (sub-resource table / multi-select)
   */
  relationType?: RelationType;
  /** Override the display order in form views. Lower values come first. */
  position?: number;
  options?: unknown;
  /** Nested array detail layout (renders via `detailFixed`). */
  detail?: DetailConfig;
};

export type JsonColumn = {
  id: string;
  column?: string;
  label?: string;
  hiddenInTable?: boolean;
  hiddenInForm?: boolean;
  hiddenInView?: boolean;
  sortable?: boolean;
  defaultSort?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  createable?: boolean;
  updateable?: boolean;
  /** Hide the label for this control in form views. */
  hideLabel?: boolean;
  /**
   * Show this field only when another field matches a value.
   * e.g. `{ "field": "source", "eq": "existing" }`
   * Translates to a JSON Forms `SHOW` rule.
   */
  showWhen?: { field: string; eq?: unknown; neq?: unknown; exists?: boolean; notExists?: boolean };
  /**
   * Hide this field when another field matches a value.
   * e.g. `{ "field": "source", "eq": "new" }`
   * Translates to a JSON Forms `HIDE` rule.
   */
  hideWhen?: { field: string; eq?: unknown; neq?: unknown; exists?: boolean; notExists?: boolean };
  /**
   * Disable this field when another field has no value (or matches a condition).
   * e.g. `{ "field": "author_origin", "notExists": true }` — disabled when author_origin is empty.
   * Translates to a JSON Forms `DISABLE` rule.
   */
  disabledWhen?: { field: string; eq?: unknown; neq?: unknown; exists?: boolean; notExists?: boolean };
  /** Display a nested key (e.g. `"name"` for `speech.name`). Maps to `TextCellBuilder.key()`. */
  displayKey?: string;
  /** Override the sort column (e.g. `"speech.name"`). Maps to `TextCellBuilder.setSortId()`. */
  sortId?: string;
  /** Mark as the primary key column for lookup resolution. */
  idField?: boolean;
  /** Include this column as a display label in the resource lookup descriptor. */
  showInLookup?: boolean;
  /**
   * JSON schema type for this column when no Zod schema is available.
   * Defaults to `"string"`. Used by `buildViewsFromColumns`.
   */
  columnType?: string;
  fieldInput?: FieldInput;
  [k: string]: unknown;
};

type JsonColumnsMap = Record<string, Omit<JsonColumn, 'id'>>;

/**
 * A column whose value is computed by a raw SQL subquery at query time.
 * The `sqlExpression` may reference the parent table via the alias `main`.
 *
 * Example:
 * ```json
 * {
 *   "id": "inception",
 *   "alias": "inception",
 *   "label": "Available in inception",
 *   "sqlExpression": "SELECT COUNT(id) FROM text_content WHERE text_content.text_id = main.id",
 *   "position": 8
 * }
 * ```
 */
export type CalculatedColumn = {
  /** Column identifier used in the response payload and UI schema. */
  id: string;
  /** SQL alias — must match `id`. */
  alias: string;
  /** Human-readable label shown in the table header. */
  label?: string;
  /**
   * Raw SQL subquery. Use `main` as the alias for the parent table row,
   * e.g. `SELECT COUNT(*) FROM child WHERE child.parent_id = main.id`.
   */
  sqlExpression: string;
  /** JSON schema / cast type for the computed value. Defaults to `"number"`. `"string"` skips CAST. */
  type?: 'number' | 'boolean' | 'string';
  /**
   * Insertion position relative to the other visible columns.
   * Uses the same semantics as `fieldInput.position` on regular columns:
   * `position: N` places this column before the element currently at index N.
   * Can also be set via `fieldInput.position` (takes precedence).
   */
  position?: number;
  hiddenInTable?: boolean;
  hiddenInView?: boolean;
  /**
   * Field input options for rendering in form / view schemas.
   * Supports `colspan`, `format`, and any other options passed to the Control renderer.
   * `position` here takes precedence over the top-level `position`.
   */
  fieldInput?: {
    position?: number;
    options?: Record<string, unknown>;
  };
};

export type JsonActionCondition = {
  /** Row field to evaluate. */
  field: string;
  /**
   * Comparison operator. Defaults to `"eq"`.
   * - `eq` / `neq`         — strict equality
   * - `gt` / `gte` / `lt` / `lte` — numeric or date comparison
   * - `exists`             — field is not null / undefined / empty string
   * - `notExists`          — field is null / undefined / empty string
   */
  op?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists' | 'notExists';
  /** Comparison value. Not required for `exists` / `notExists`. */
  value?: unknown;
};

/** Action that calls a backend procedure endpoint. */
export type JsonProcedureAction = {
  type?: 'procedure';
  /** Unique identifier used as the URL segment, e.g. `"sendToInception"`. */
  id: string;
  /** Human-readable button label shown in the table. */
  label: string;
  /**
   * Filename (without extension) inside the resource's `actions/` directory
   * that exports the `procedure` function, e.g. `"sendToInception"`.
   */
  procedure: string;
  /** HTTP method for the frontend to call this action. Defaults to `"post"`. */
  method?: string;
  /**
   * Static data payload merged into the request body by the frontend.
   * Values may contain `{id}` which the frontend replaces with the record id.
   * e.g. `{ "textId": "{id}" }`.
   */
  data?: Record<string, unknown>;
  /** Optional condition evaluated per row. Button is hidden when the condition is false. */
  condition?: JsonActionCondition;
};

/** Action that opens a URL in a new browser tab — no backend call. */
export type JsonLinkAction = {
  type: 'link';
  /** Unique identifier for the action. */
  id: string;
  /** Human-readable button label shown in the table. */
  label: string;
  /**
   * URL to open. May contain `{id}` which the frontend replaces with the record id.
   * e.g. `"/preview/{id}"`.
   */
  href: string;
  /** Optional condition evaluated per row. Button is hidden when the condition is false. */
  condition?: JsonActionCondition;
};

export type JsonAction = JsonProcedureAction | JsonLinkAction;

export type JsonResourceConfig = {
  name: string;
  route: string;
  model: string;
  tag: string;
  title?: string;
  table?: string;
  idType?: 'number' | 'string';
  database?: string;
  sidebar?: { hide?: boolean; position?: number };
  operations: JsonOperations;
  columns?: JsonColumn[] | JsonColumnsMap;
  calculatedColumns?: CalculatedColumn[];
  actions?: JsonAction[];
  /** Modal width when opening the form for this resource. One of `xs`, `sm`, `lg`, `xl`. */
  modalSize?: 'xs' | 'sm' | 'lg' | 'xl';
  /**
   * Prisma relation names to include when querying this resource.
   * e.g. `["author"]` adds `include: { author: true }` to findMany queries.
   */
  include?: string[];
};

/**
 * Derive a human-readable label from a column id.
 * `"field_label"` → `"Field label"`, `"fieldLabel"` → `"Field label"`
 */
export const labelFromId = (id: string): string => {
  const words = id
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .replace(/[_-]+/g, ' ')              // snake_case / kebab-case → spaces
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
};

/** Normalise `columns` from either array or object-map form. */
export const normalizeColumns = (
  columns: JsonColumn[] | JsonColumnsMap | undefined,
): JsonColumn[] | undefined => {
  if (!columns) return undefined;
  const raw: JsonColumn[] = Array.isArray(columns)
    ? columns
    : Object.entries(columns).map(([id, col]) => ({ id, ...col }));
  return raw.map((col) => ({
    ...col,
    label: col.label ?? labelFromId(col.id),
  }));
};
