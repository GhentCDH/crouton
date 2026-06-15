/**
 * diff: reconcile a generated `ResourceDraft` against an existing resource.json.
 *
 * Produces serializable `Decision`s with recommended defaults:
 *  - new resource           → `addToSidebar` (recommended yes)
 *  - DB field not in config  → `addColumn` (recommended add)
 *  - config field not in DB  → `removeColumn` (recommended keep — never auto-delete)
 *  - field in both, changed   → `reconcileColumn` (recommended keep)
 *  - field in both, identical → no decision (keeps the run idempotent)
 */

import type { Decision, JsonResourceConfig, ResourceDiff, ResourceDraft } from './types';
import { columnEntries, deepEqual } from './util';

export interface DiffInput {
  draft: ResourceDraft;
  existing?: JsonResourceConfig | null;
  hasSchemaFile?: boolean;
}

export const diff = ({ draft, existing, hasSchemaFile = false }: DiffInput): ResourceDiff => {
  const decisions: Decision[] = [];
  const isNew = !existing;

  if (isNew) {
    decisions.push({
      id: 'sidebar',
      kind: 'addToSidebar',
      recommended: 'yes',
      options: ['yes', 'no'],
      context: `New resource "${draft.name}"`,
    });
  } else {
    const draftMap = new Map(columnEntries(draft.config.columns));
    const existingMap = new Map(columnEntries(existing.columns));

    // DB-driven columns (draft order) vs existing.
    for (const id of draft.columnOrder) {
      const draftCol = draftMap.get(id);
      if (!draftCol) continue;
      if (!existingMap.has(id)) {
        decisions.push({
          id: `add:${id}`,
          kind: 'addColumn',
          field: id,
          recommended: 'add',
          options: ['add', 'skip'],
        });
      } else if (!deepEqual(draftCol, existingMap.get(id))) {
        decisions.push({
          id: `reconcile:${id}`,
          kind: 'reconcileColumn',
          field: id,
          recommended: 'keep',
          options: ['keep', 'overwrite', 'merge'],
          context: 'Differs from generated defaults',
        });
      }
    }

    // Existing columns no longer present in the DB schema.
    for (const [id] of existingMap) {
      if (!draftMap.has(id)) {
        decisions.push({
          id: `remove:${id}`,
          kind: 'removeColumn',
          field: id,
          recommended: 'keep',
          options: ['keep', 'remove'],
          context: 'Not found in the database schema',
        });
      }
    }
  }

  return {
    name: draft.name,
    model: draft.config.model,
    isNew,
    decisions,
    draft,
    existing: existing ?? undefined,
    hasSchemaFile,
  };
};
