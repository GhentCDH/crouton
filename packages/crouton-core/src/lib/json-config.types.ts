/**
 * Types that mirror the shape of a `resource.json` config file.
 *
 * These are pure, framework-agnostic types so they can be shared by:
 *   - `@ghentcdh/crouton-api` (loads + serves resource configs)
 *   - `@ghentcdh/crouton-codegen` (generates/updates resource configs)
 *   - any tooling that reads or writes `resource.json`
 */

import type { JsonResourceOperations } from './data-source/Operations.schema';
import { type JsonAction, type JsonColumnsMap, JsonDisplay } from './resource';
import { type CalculatedColumn } from './resource/CalculatedColumn.schema';
import { type JsonIncludeEntry } from './resource/include.schema';

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
