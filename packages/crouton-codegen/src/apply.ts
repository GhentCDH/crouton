/**
 * apply: a `ResolvedDiff` → a `WritePlan` (full file contents, no disk I/O).
 *
 * Merges resolved decisions into the existing config, preserving every key the
 * tool didn't touch (actions, calculatedColumns, include, custom fieldInput,
 * sub-resources, …). `commit` performs the actual writes.
 */

import type { JsonColumnInput } from '@ghentcdh/crouton-core';

import type { ResolvedDiff } from './decision';
import {
  serializeResourceJson,
  serializeSchemaTs,
  withResourceHeader,
} from './serialize';
import { clone, columnEntries, columnsMapFromEntries, deepEqual } from './util';
import type { WritePlan } from './write-plan';

const joinPath = (...parts: string[]): string =>
  parts.join('/').replace(/\/+/g, '/');

export interface ApplyContext {
  /** Where resource directories live (e.g. `apps/backend/src/app/resources`). */
  resourcesDir: string;
  /** Import path for the generated Zod types (e.g. `@new-polities/generated/types`). */
  generatedTypesImport: string;
  /** Export name for a model's Zod schema. Default `<PrismaName>WithRelationsSchema`. */
  schemaExportName?: (prismaName: string) => string;
  /**
   * Whether a newly-scaffolded resource is written with `draft: true` (so it isn't served
   * until reviewed). Falls back to `true` when the caller omits it — used by the dev-tools
   * "create resource" endpoint, which has no CLI-style flag/prompt of its own. The `crouton
   * update resources` CLI always resolves and passes an explicit value (default `false`,
   * see `resolveDraftOption` in `crouton-cli/src/update/runner.ts`).
   */
  draft?: boolean;
}

type Column = Omit<JsonColumnInput, 'id'>;

export const apply = (resolved: ResolvedDiff, ctx: ApplyContext): WritePlan => {
  const { diff, resolutions } = resolved;
  const exportNameFor = ctx.schemaExportName ?? ((p: string) => `${p}WithRelationsSchema`);
  const dir = joinPath(ctx.resourcesDir, diff.name);
  const notes = diff.draft.unwiredRelations.map(
    (r) => `Relation "${r.field}" → model "${r.targetModel}": target resource not found; left hidden.`,
  );
  const files: WritePlan['files'] = [];

  if (diff.isNew) {
    const config = clone(diff.draft.config);
    const addToSidebar = (resolutions.get('sidebar') ?? 'yes') !== 'no';
    config.sidebar = { hide: !addToSidebar };
    const draft = ctx.draft ?? true; // new resources are drafts unless --no-draft
    files.push({
      path: joinPath(dir, 'resource.json'),
      contents: serializeResourceJson(withResourceHeader(config, { draft })),
      action: 'create',
    });
  } else {
    const existing = clone(diff.existing!);
    const draftMap = new Map<string, Column>(columnEntries(diff.draft.config.columns));
    const entries = columnEntries(existing.columns);
    const indexOf = (id: string) => entries.findIndex(([eid]) => eid === id);

    for (const decision of diff.decisions) {
      const choice = resolutions.get(decision.id) ?? decision.recommended;
      const field = decision.field;
      if (!field) continue;

      if (decision.kind === 'addColumn' && choice === 'add') {
        const col = draftMap.get(field);
        if (col && indexOf(field) === -1) entries.push([field, col]);
      } else if (decision.kind === 'reconcileColumn') {
        const i = indexOf(field);
        if (i === -1) continue;
        if (choice === 'overwrite') {
          const col = draftMap.get(field);
          if (col) entries[i] = [field, col];
        } else if (choice === 'merge') {
          const col = draftMap.get(field);
          if (col) entries[i] = [field, { ...col, ...entries[i][1] }];
        }
        // 'keep' → leave as-is
      } else if (decision.kind === 'removeColumn' && choice === 'remove') {
        const i = indexOf(field);
        if (i !== -1) entries.splice(i, 1);
      }
    }

    const config = { ...existing, columns: columnsMapFromEntries(entries) };
    // Only write when something actually changed — keep "adjusted files only".
    // The header (re-stamped $schema/schemaVersion) is applied at serialize time only, so
    // it doesn't by itself trigger a rewrite; an existing `draft` value is preserved.
    if (!deepEqual(config, diff.existing)) {
      files.push({
        path: joinPath(dir, 'resource.json'),
        contents: serializeResourceJson(withResourceHeader(config)),
        action: 'update',
      });
    }
  }

  // schema.ts is created only when absent; never clobber a hand-written one.
  if (!diff.hasSchemaFile) {
    // zod-prisma-types only emits `…WithRelationsSchema` for models that have
    // relations; relation-less models only have the plain `…Schema`. Fall back
    // so the generated import always resolves to a real export.
    const exportName = diff.draft.hasRelations
      ? exportNameFor(diff.draft.prismaName)
      : `${diff.draft.prismaName}Schema`;
    files.push({
      path: joinPath(dir, 'schema.ts'),
      contents: serializeSchemaTs(exportName, ctx.generatedTypesImport),
      action: 'create',
    });
  }

  return { resource: diff.name, files, notes };
};
