/**
 * Types that mirror the shape of a `resource.json` config file.
 *
 * These are pure, framework-agnostic types so they can be shared by:
 *   - `@ghentcdh/crouton-api` (loads + serves resource configs)
 *   - `@ghentcdh/crouton-codegen` (generates/updates resource configs)
 *   - any tooling that reads or writes `resource.json`
 */

import type { JsonResourceOperations } from './data-source/Operations.schema';
import { type JsonAction, JsonColumnsMap } from './resource';
import { type CalculatedColumn } from './resource/CalculatedColumn.schema';
import { type JsonIncludeEntry } from './resource/include.schema';
import { JsonColumn } from './resource/Column';

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
  columns?: JsonColumnsMap;
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
