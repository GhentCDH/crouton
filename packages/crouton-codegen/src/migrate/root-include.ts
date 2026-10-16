import type { ResourceJson } from '@ghentcdh/crouton-core';

type MigrationResult = { changed: boolean; json: ResourceJson };

/**
 * Moves root-level `include` to `operations.findAll.include` (and findOne.include).
 * Both get the same list since the old field was not per-operation.
 */
export const migrateRootInclude = (json: ResourceJson): MigrationResult => {
  const raw = json as any;
  if (!raw.include?.length) return { changed: false, json };

  const include = raw.include;
  const { include: _removed, ...rest } = raw;

  const ops = rest.operations ?? {};
  const findAll = typeof ops.findAll === 'object' && ops.findAll !== null
    ? { ...ops.findAll, include }
    : { include };
  const findOne = typeof ops.findOne === 'object' && ops.findOne !== null
    ? { ...ops.findOne, include }
    : { include };

  return {
    changed: true,
    json: {
      ...rest,
      operations: {
        ...ops,
        findAll,
        findOne,
      },
    } as unknown as ResourceJson,
  };
};
