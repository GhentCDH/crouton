import { describe, expect, it, vi } from 'vitest';

import type { Row } from '@ghentcdh/crouton-core';

import { loadRelationsIntoRow, loadRelationsIntoRows } from './relation-loader';
import type { SubResourceConfig } from '../../resource/SubResource.schema';

const baseSub = (overrides: Partial<SubResourceConfig>): SubResourceConfig =>
  ({
    column: 'child',
    relation: 'child',
    childRoute: 'child',
    childKind: 'custom',
    childModel: '',
    foreignKey: 'childId',
    idField: 'id',
    idType: 'string',
    operations: { findAll: true, findOne: true, create: true, update: true, patch: true, delete: true },
    relationType: 'manyToOne',
    ...overrides,
  } as SubResourceConfig);

describe('loadRelationsIntoRow', () => {
  it('returns row unchanged when no subs', async () => {
    const row: Row = { id: '1', name: 'test' };
    const result = await loadRelationsIntoRow(row, [], 'id', {});
    expect(result).toBe(row);
  });

  it('manyToOne custom child: calls findOne with FK value', async () => {
    const childRow = { id: '42', label: 'child' };
    const repo = { findOne: vi.fn().mockResolvedValue(childRow) };
    const sub = baseSub({ relationType: 'manyToOne', repository: repo as never });
    const row: Row = { id: '1', childId: '42' };

    const result = await loadRelationsIntoRow(row, [sub], 'id', {});

    expect(repo.findOne).toHaveBeenCalledWith('42', { prisma: {} });
    expect(result).toEqual({ id: '1', childId: '42', child: childRow });
  });

  it('manyToOne custom child: returns null when FK is absent', async () => {
    const repo = { findOne: vi.fn() };
    const sub = baseSub({ relationType: 'manyToOne', repository: repo as never });
    const row: Row = { id: '1', childId: null };

    const result = await loadRelationsIntoRow(row, [sub], 'id', {});

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(result['child']).toBeNull();
  });

  it('oneToMany custom child: calls findAllByParent with parentId', async () => {
    const childRows = [{ id: 'c1' }, { id: 'c2' }];
    const repo = { findAllByParent: vi.fn().mockResolvedValue({ data: childRows }) };
    const sub = baseSub({ relationType: 'oneToMany', repository: repo as never });
    const row: Row = { id: '1' };

    const result = await loadRelationsIntoRow(row, [sub], 'id', {});

    expect(repo.findAllByParent).toHaveBeenCalledWith('1', expect.objectContaining({ page: 1 }), { prisma: {} });
    expect(result['child']).toEqual(childRows);
  });

  it('custom child with no repository returns null/[]', async () => {
    const manyToOne = baseSub({ relationType: 'manyToOne', repository: undefined });
    const oneToMany = baseSub({ relationType: 'oneToMany', repository: undefined });
    const row: Row = { id: '1', childId: '42' };

    const r1 = await loadRelationsIntoRow(row, [manyToOne], 'id', {});
    const r2 = await loadRelationsIntoRow(row, [oneToMany], 'id', {});

    expect(r1['child']).toBeNull();
    expect(r2['child']).toEqual([]);
  });

  it('prisma child: uses getDelegate findUnique for manyToOne', async () => {
    const childRow = { id: '42' };
    const delegate = { findUnique: vi.fn().mockResolvedValue(childRow) };
    const prismaClient = { child: delegate };
    const sub = baseSub({ childKind: 'prisma', childModel: 'child', relationType: 'manyToOne' });
    const row: Row = { id: '1', childId: '42' };

    const result = await loadRelationsIntoRow(row, [sub], 'id', prismaClient);

    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: '42' } });
    expect(result['child']).toEqual(childRow);
  });
});

describe('loadRelationsIntoRows', () => {
  it('returns rows unchanged when no subs', async () => {
    const rows: Row[] = [{ id: '1' }, { id: '2' }];
    const result = await loadRelationsIntoRows(rows, [], 'id', {});
    expect(result).toBe(rows);
  });

  it('applies loader to each row', async () => {
    const repo = { findOne: vi.fn().mockResolvedValue({ id: 'x' }) };
    const sub = baseSub({ relationType: 'manyToOne', repository: repo as never });
    const rows: Row[] = [{ id: '1', childId: 'x' }, { id: '2', childId: 'x' }];

    const result = await loadRelationsIntoRows(rows, [sub], 'id', {});

    expect(result).toHaveLength(2);
    expect(result[0]['child']).toEqual({ id: 'x' });
    expect(result[1]['child']).toEqual({ id: 'x' });
  });
});
