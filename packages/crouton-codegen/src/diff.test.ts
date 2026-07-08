import { describe, expect, it } from 'vitest';

import { classify } from './classify';
import type { DbModel } from './db-model';
import { diff } from './diff';

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
    { name: 'code', kind: 'scalar', type: 'String', isList: false, isRequired: true, isId: false, isUnique: true, isUpdatedAt: false, hasDefault: false, isTimestamp: false },
  ],
};

describe('diff', () => {
  it('flags a new resource and recommends adding to the sidebar', () => {
    const d = diff({ draft: classify(model) });
    expect(d.isNew).toBe(true);
    expect(d.decisions).toEqual([
      expect.objectContaining({ id: 'sidebar', kind: 'addToSidebar', recommended: 'yes' }),
    ]);
  });

  it('proposes adding DB columns missing from an existing config', () => {
    const existing = {
      name: 'language', route: 'language', model: 'language', tag: 'Language',
      operations: { findAll: true },
      columns: { id: { idField: true, hiddenInTable: true, hiddenInForm: true, hiddenInView: true } },
    };
    const d = diff({ draft: classify(model), existing });
    const ids = d.decisions.map((x) => x.id);
    expect(ids).toContain('add:name');
    expect(ids).toContain('add:code');
    expect(d.decisions.every((x) => x.kind !== 'addToSidebar')).toBe(true);
  });

  it('raises reconcile only when an existing column differs', () => {
    const draft = classify(model);
    const existing = {
      name: 'language', route: 'language', model: 'language', tag: 'Language',
      operations: { findAll: true },
      columns: {
        // identical to generated → no decision
        id: { idField: true, hiddenInTable: true, hiddenInForm: true, hiddenInView: true },
        // changed (hand-edited control) → reconcile
        name: { fieldInput: { type: 'markdown', position: 0 } },
        code: { fieldInput: { type: 'text', position: 1 } },
      },
    };
    const d = diff({ draft, existing });
    const recon = d.decisions.filter((x) => x.kind === 'reconcileColumn').map((x) => x.field);
    expect(recon).toContain('name');
    expect(recon).not.toContain('id');
  });

  it('recommends keeping columns not present in the DB', () => {
    const existing = {
      name: 'language', route: 'language', model: 'language', tag: 'Language',
      operations: { findAll: true },
      columns: {
        id: { idField: true, hiddenInTable: true, hiddenInForm: true, hiddenInView: true },
        name: { fieldInput: { type: 'text', position: 0 } },
        code: { fieldInput: { type: 'text', position: 1 } },
        legacy_field: { fieldInput: { type: 'text' } },
      },
    };
    const d = diff({ draft: classify(model), existing });
    expect(d.decisions).toContainEqual(
      expect.objectContaining({ id: 'remove:legacy_field', kind: 'removeColumn', recommended: 'keep' }),
    );
  });
});
