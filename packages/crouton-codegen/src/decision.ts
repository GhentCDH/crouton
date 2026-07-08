/** Decision and diff types produced by the `diff` stage. */

import type { ResourceJsonInput } from '@ghentcdh/crouton-core';

import type { ResourceDraft } from './draft';

export type DecisionKind =
  'addToSidebar' | 'addColumn' | 'removeColumn' | 'reconcileColumn';

export interface Decision {
  /** Stable id, e.g. `add:email`, `reconcile:title`, `sidebar`. */
  id: string;
  kind: DecisionKind;
  /** Column field name (absent for `addToSidebar`). */
  field?: string;
  /** Recommended choice — used as the default by any resolver. */
  recommended: string;
  /** Allowed choices in display order. */
  options: string[];
  /** Human context for prompts (e.g. "type changed: String → Int"). */
  context?: string;
}

export interface ResourceDiff {
  /** Directory / route name. */
  name: string;
  /** PrismaClient accessor (resource.json `model`). */
  model: string;
  isNew: boolean;
  decisions: Decision[];
  /** Carried forward to `apply`. */
  draft: ResourceDraft;
  /** Parsed existing resource.json, if any. */
  existing?: ResourceJsonInput;
  /** True when a sibling schema.ts already exists. */
  hasSchemaFile: boolean;
}

export interface Resolution {
  decisionId: string;
  choice: string;
  /** Optional free-form value for future decisions (e.g. a renamed route). */
  value?: string;
}

export interface ResolvedDiff {
  diff: ResourceDiff;
  resolutions: Map<string, string>;
}