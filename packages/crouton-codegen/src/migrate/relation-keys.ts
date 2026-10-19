type RawNode = Record<string, unknown>;

export type RelationKeysMigrationReport = {
  /** Column ids that had `fieldInput.resource` (and related keys) lifted to `relation`. */
  migratedColumns: string[];
};

/**
 * Migrate relation config out of `fieldInput` into the new top-level `relation` field.
 *
 * Lifted keys:
 *   `fieldInput.resource`    → `relation.resource`
 *   `fieldInput.relationType` → `relation.type`
 *   `fieldInput.foreignKey`  → `relation.foreignKey`
 *   `fieldInput.relation`    → `relation.prismaField`
 *   `fieldInput.options.sort`    → `relation.sort`
 *   `fieldInput.options.sortDir` → `relation.sortDir`
 *
 * `fieldInput.format: "relation"` and `fieldInput.options.resource` are also removed
 * since they are subsumed by the new `relation` field.
 */
export const migrateRelationKeys = (
  resource: Record<string, unknown>,
): { resource: Record<string, unknown>; report: RelationKeysMigrationReport } => {
  const report: RelationKeysMigrationReport = { migratedColumns: [] };

  const rawColumns = resource['columns'];
  if (!rawColumns || typeof rawColumns !== 'object' || Array.isArray(rawColumns)) {
    return { resource, report };
  }

  let changed = false;
  const newColumns: Record<string, RawNode> = {};

  for (const [id, col] of Object.entries(rawColumns as Record<string, RawNode>)) {
    const fi = col['fieldInput'] as RawNode | undefined;
    if (!fi || typeof fi !== 'object') {
      newColumns[id] = col;
      continue;
    }

    // Only migrate columns with fieldInput.resource or format: "relation"
    const hasRelationResource = typeof fi['resource'] === 'string';
    const hasRelationFormat = fi['format'] === 'relation';

    if (!hasRelationResource && !hasRelationFormat) {
      newColumns[id] = col;
      continue;
    }

    // Skip if already migrated (relation field present)
    if (col['relation'] !== undefined) {
      newColumns[id] = col;
      continue;
    }

    report.migratedColumns.push(id);
    changed = true;

    const opts = fi['options'] as RawNode | undefined;

    // Build new relation object
    const relation: RawNode = {};
    if (typeof fi['resource'] === 'string') relation['resource'] = fi['resource'];
    if (fi['relationType'] !== undefined) relation['type'] = fi['relationType'];
    if (fi['foreignKey'] !== undefined) relation['foreignKey'] = fi['foreignKey'];
    if (fi['relation'] !== undefined) relation['prismaField'] = fi['relation'];
    if (opts && typeof opts['sort'] === 'string') relation['sort'] = opts['sort'];
    if (opts && opts['sortDir'] !== undefined) relation['sortDir'] = opts['sortDir'];

    // Strip migrated keys from fieldInput
    const {
      resource: _r,
      relationType: _rt,
      foreignKey: _fk,
      relation: _rel,
      format: _fmt,
      ...restFi
    } = fi;

    // Strip migrated keys from fieldInput.options
    let newFi: RawNode = restFi;
    if (opts) {
      const { sort: _s, sortDir: _sd, resource: _or, displayKey: _dk, ...restOpts } = opts as RawNode & {
        sort?: unknown;
        sortDir?: unknown;
        resource?: unknown;
        displayKey?: unknown;
      };
      newFi = Object.keys(restOpts).length > 0 ? { ...restFi, options: restOpts } : restFi;
    }

    // Move displayKey from opts to column root if present and not already there
    const optsDisplayKey = opts?.['displayKey'];
    const colDisplayKey = col['displayKey'];

    const newCol: RawNode = {
      ...col,
      ...(Object.keys(relation).length > 0 && { relation }),
    };

    // Lift displayKey to column root (if not already there)
    if (optsDisplayKey !== undefined && colDisplayKey === undefined) {
      newCol['displayKey'] = optsDisplayKey;
    }

    // Only keep fieldInput if it still has meaningful keys
    const meaningfulFiKeys = Object.keys(newFi).filter((k) => k !== '$schema');
    if (meaningfulFiKeys.length > 0) {
      newCol['fieldInput'] = newFi;
    } else {
      delete newCol['fieldInput'];
    }

    newColumns[id] = newCol;
  }

  if (!changed) return { resource, report };
  return { resource: { ...resource, columns: newColumns }, report };
};
