import { describe, expect, it } from 'vitest';

import { CroutonValidationError } from './crouton-validation.error';
import {
  findUniqueColumn,
  mapPrismaUniqueError,
  uniqueColumns,
} from './unique-validation';

const config = {
  columns: [
    { id: 'id', idField: true },
    { id: 'email', label: 'Email', unique: true },
    { id: 'slug', column: 'slug_db', unique: { message: 'Slug taken' } },
    { id: 'tenantId' },
    { id: 'code', label: 'Code', unique: { scope: ['tenantId'] } },
    { id: 'name' },
  ],
} as any;

describe('uniqueColumns / findUniqueColumn', () => {
  it('lists only declared-unique columns', () => {
    expect(uniqueColumns(config).map((e) => e.column.id)).toEqual([
      'email',
      'slug',
    ]);
  });

  it('finds a unique column by id, and ignores non-unique ones', () => {
    expect(findUniqueColumn(config, 'email')?.unique).toEqual({ enabled: true });
    expect(findUniqueColumn(config, 'name')).toBeUndefined();
  });
});

describe('mapPrismaUniqueError', () => {
  it('returns undefined for non-P2002 errors', () => {
    expect(mapPrismaUniqueError({ code: 'P2025' }, config)).toBeUndefined();
    expect(mapPrismaUniqueError(new Error('boom'), config)).toBeUndefined();
  });

  it('maps a P2002 target column back to its field with a default message', () => {
    const err = mapPrismaUniqueError(
      { code: 'P2002', meta: { target: ['email'] } },
      config,
    );
    expect(err).toBeInstanceOf(CroutonValidationError);
    expect(err?.errors).toEqual([
      { field: 'email', message: 'Email already exists', code: 'unique' },
    ]);
  });

  it('resolves a db column name to its column id and uses a custom message', () => {
    const err = mapPrismaUniqueError(
      { code: 'P2002', meta: { target: ['slug_db'] } },
      config,
    );
    expect(err?.errors).toEqual([
      { field: 'slug', message: 'Slug taken', code: 'unique' },
    ]);
  });

  it('falls back to a generic field when the target is unknown', () => {
    const err = mapPrismaUniqueError({ code: 'P2002', meta: {} }, config);
    expect(err?.errors[0].field).toBe('value');
  });
});

describe('mapPrismaUniqueError — composite', () => {
  it('attributes a composite constraint to the scoped column only', () => {
    const err = mapPrismaUniqueError(
      { code: 'P2002', meta: { target: ['code', 'tenantId'] } },
      config,
    );
    expect(err?.errors).toEqual([
      { field: 'code', message: 'Code already exists', code: 'unique' },
    ]);
  });
});
