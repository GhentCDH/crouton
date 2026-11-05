import { describe, expect, it } from 'vitest';

import type { DbModel, ExistingResource } from './index';

import { buildResourceDiff, resolveRuleset } from './plan';

const model: DbModel = {
  prismaName: 'Language',
  clientAccessor: 'language',
  tableName: 'language',
  idField: 'id',
  idType: 'string',
  hasCompositeId: false,
  fields: [
    { name: 'id', kind: 'id', type: 'String', isList: false, isRequired: true, isId: true, isUnique: false, isUpdatedAt: false, hasDefault: true, isTimestamp: false },
    { name: 'name', kind: 'scalar', type: 'String', isList: false, isRequired: true, isId: false, isUnique: false, isUpdatedAt: false, hasDefault: false, isTimestamp: false },
  ],
};

const noExisting = async (): Promise<ExistingResource> => ({ config: null, hasSchemaFile: false });

describe('resolveRuleset', () => {
  it('merges overrides over defaults', () => {
    const r = resolveRuleset({ rules: { hideRelationsInTable: false } });
    expect(r.hideRelationsInTable).toBe(false);
    expect(r.hideIdInTable).toBe(true); // default preserved
  });
});

describe('buildResourceDiff', () => {
  it('produces a new-resource diff when nothing exists on disk', async () => {
    const d = await buildResourceDiff(model, { database: 'docsdb', readExisting: noExisting });
    expect(d.isNew).toBe(true);
    expect(d.name).toBe('language');
    expect(d.decisions.map((x) => x.kind)).toContain('addToSidebar');
  });

  it('produces add-column decisions against an existing config', async () => {
    const readExisting = async (): Promise<ExistingResource> => ({
      config: {
        name: 'language', route: 'language', model: 'language', tag: 'Language',
        operations: { findAll: true },
        columns: { id: { idField: true, hiddenInTable: true, hiddenInForm: true, hiddenInView: true } },
      },
      hasSchemaFile: true,
    });
    const d = await buildResourceDiff(model, { database: 'docsdb', readExisting });
    expect(d.isNew).toBe(false);
    expect(d.decisions.map((x) => x.id)).toContain('add:name');
  });
});
