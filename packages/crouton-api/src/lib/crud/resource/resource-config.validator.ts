import { type JsonColumn, normalizeUnique } from '@ghentcdh/crouton-core';

import { type CrudOperation, isOperationEnabled, resolveDefinition } from '../crud.config';
import type { Resource } from './ResourceConfig.schema';
import { validateCustomRepository } from '../custom-repository/custom-repository.validate';

const ALL_OPS: readonly CrudOperation[] = [
  'findAll',
  'findOne',
  'create',
  'update',
  'patch',
  'delete',
];

/**
 * Run structural checks on a fully-built Resource config before it is served.
 * Returns errors (→ resourceLoadErrorsRegistry) and warnings (→ resourceLoadReportRegistry).
 *
 * @param repositoryFileExistsOnDisk - pass true when a repository.ts file exists next to
 *   a prisma resource, so the validator can warn that it will be ignored.
 */
export const validateResourceConfig = (
  config: Resource,
  opts?: { repositoryFileExistsOnDisk?: boolean },
): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const definition = resolveDefinition(config);
  const enabledOps = ALL_OPS.filter((op) => isOperationEnabled(definition, op));

  if (enabledOps.length === 0) {
    warnings.push('All operations are disabled — this resource serves nothing.');
  }

  if (config.kind === 'custom') {
    if (config.database) {
      warnings.push(
        '"database" is set alongside kind: "custom" — it selects the client injected as ' +
          'ctx.prisma, but data access still comes from repository.ts.',
      );
    }

    const repoError = validateCustomRepository(config, config.repository);
    if (repoError) errors.push(repoError);
  } else {
    if (opts?.repositoryFileExistsOnDisk) {
      warnings.push(
        'repository.ts is present on a prisma resource and will be ignored — ' +
          'set kind: "custom" if you want to use it for data access.',
      );
    }
  }

  // ── Uniqueness checks ──────────────────────────────────────────────────
  // A real DB `@unique` constraint can't be seen from the config, so that
  // prerequisite is only documented — but a bad `scope` reference is catchable.
  const columns = (config.columns as unknown as JsonColumn[] | undefined) ?? [];
  const columnIds = new Set(columns.map((c) => c.id));
  for (const col of columns) {
    const unique = normalizeUnique(col.unique);
    if (!unique) continue;
    if (col.idField) {
      warnings.push(
        `Column "${col.id}" is the id field; "unique" is redundant there.`,
      );
    }
    for (const scopeId of unique.scope ?? []) {
      if (!columnIds.has(scopeId)) {
        errors.push(
          `Column "${col.id}" has unique.scope referencing unknown column "${scopeId}".`,
        );
      }
    }
  }

  return { errors, warnings };
};
