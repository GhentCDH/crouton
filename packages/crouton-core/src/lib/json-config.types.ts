/**
 * Types that mirror the shape of a `resource.json` config file.
 *
 * These are pure, framework-agnostic types so they can be shared by:
 *   - `@ghentcdh/crouton-api` (loads + serves resource configs)
 *   - `@ghentcdh/crouton-codegen` (generates/updates resource configs)
 *   - any tooling that reads or writes `resource.json`
 */

import type { JsonResourceOperations } from './data-source/Operations.schema';
import type { RelationType } from './relation.types';
import { type JsonAction } from './resource';
import { type JsonIncludeEntry } from './resource/include.schema';
import { CalculatedColumn } from './resource/CalculatedColumn.schema';

export type JsonDisplay = {
  mode?: 'page' | 'modal';
  customComponent?: string | null;
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

/**
 * Options for relation field inputs (`fieldInput.format === "relation"`).
 * These are injected into the frontend control and — for `sort`/`sortDir` —
 * also used by the backend to apply `orderBy` on included relation records.
 */
export type RelationFieldInputOptions = {
  /** Field to sort related records by, e.g. `"title"` or `"author.name"`. */
  sort?: string;
  /** Sort direction. Defaults to `"asc"` when omitted. */
  sortDir?: 'asc' | 'desc';
  /** CSS flex direction for the relation control button layout. */
  direction?: string;
  /** Key used as the display label in the relation control. */
  displayKey?: string;
  /** Path to the related resource (resolved to a URI at load time). */
  resource?: string;
  [k: string]: unknown;
};

export type FieldInput = {
  type: string;
  customRender?: string;
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
  options?: RelationFieldInputOptions | unknown;
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
  showWhen?: {
    field: string;
    eq?: unknown;
    neq?: unknown;
    exists?: boolean;
    notExists?: boolean;
  };
  /**
   * Hide this field when another field matches a value.
   * e.g. `{ "field": "source", "eq": "new" }`
   * Translates to a JSON Forms `HIDE` rule.
   */
  hideWhen?: {
    field: string;
    eq?: unknown;
    neq?: unknown;
    exists?: boolean;
    notExists?: boolean;
  };
  /**
   * Disable this field when another field has no value (or matches a condition).
   * e.g. `{ "field": "author_origin", "notExists": true }` — disabled when author_origin is empty.
   * Translates to a JSON Forms `DISABLE` rule.
   */
  disabledWhen?: {
    field: string;
    eq?: unknown;
    neq?: unknown;
    exists?: boolean;
    notExists?: boolean;
  };
  /** Display a nested key (e.g. `"name"` for `speech.name`). Maps to `TextCellBuilder.key()`. */
  displayKey?: string;
  /** Override the sort column (e.g. `"speech.name"`). Maps to `TextCellBuilder.setSortId()`. */
  sortId?: string;
  /**
   * Name of a shared enum in the project enum registry (`crouton.enums.json`).
   * At load time the loader injects that enum's `{ value, label }[]` into
   * `fieldInput.options.values`, so columns don't duplicate the option list.
   */
  enum?: string;
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
  /**
   * Path to another `resource.json` whose columns are expanded as nested sub-columns
   * under this column's object key.
   *
   * Example: `"extend": "../internalAuthor/resource.json"` on a column `author`
   * auto-generates virtual sub-columns like `author_name` (column: "author", displayKey: "name").
   *
   * Visibility (`hiddenInTable/Form/View`) on this column is inherited by all sub-columns as a
   * default; the referenced resource's own column visibility further restricts it.
   */
  extend?: string;
  /**
   * Per-sub-column overrides when using `extend`.
   * Key: the virtual column id (`"{extendId}_{refColId}"`) or just the referenced column id.
   * Value: any `JsonColumn` fields to merge over the generated virtual column.
   */
  columns?: Record<string, Partial<Omit<JsonColumn, 'id'>>>;
  [k: string]: unknown;
};

export type JsonColumnsMap = Record<string, Omit<JsonColumn, 'id'>>;

/** @deprecated use ResourceJson
 *
 */
export type JsonResourceConfig = {
  name: string;
  route: string;
  model: string;
  tag: string;
  title?: string;
  table?: string;
  // TODO check if used, shoudl be derived from the column
  idType?: 'number' | 'string';
  database?: string;
  sidebar?: {
    /** Hide this resource from the sidebar entirely. */
    hide?: boolean;
    /** Order within its group (or at the top level). Lower values come first. */
    position?: number;
    /** Override the sidebar label. Defaults to the resource `title`. */
    label?: string;
    /**
     * Slug of the group this resource belongs to.
     * Must match a key in `sidebarGroups` in `crouton.json`.
     * Resources with the same `group` are nested under a shared collapsible section.
     */
    group?: string;
  };
  display?: JsonDisplay;
  operations: JsonResourceOperations;
  columns?: JsonColumn[] | JsonColumnsMap;
  calculatedColumns?: CalculatedColumn[];
  actions?: JsonAction[];
  /** Global table-level actions (no record id). Shown as toolbar buttons. */
  tableActions?: JsonAction[];
  /** Modal width when opening the form for this resource. One of `xs`, `sm`, `lg`, `xl`. */
  modalSize?: 'xs' | 'sm' | 'lg' | 'xl';
  /**
   * Relations to include when querying this resource.
   * Each entry is either a plain relation name (`"author"` → `include: { author: true }`)
   * or an object for nested includes:
   * `{ "relation": "text_author", "include": ["author"] }` →
   *   `include: { text_author: { include: { author: true } } }`
   */
  include?: JsonIncludeEntry[];
};

/**
 * Derive a human-readable label from a column id.
 * `"field_label"` → `"Field label"`, `"fieldLabel"` → `"Field label"`
 */
export const labelFromId = (id: string): string => {
  const words = id
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .replace(/[_-]+/g, ' ') // snake_case / kebab-case → spaces
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
