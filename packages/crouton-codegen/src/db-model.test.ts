import { describe, expect, it } from 'vitest';

import { type DbModel, excludeModels } from './db-model';

const model = (prismaName: string, tableName?: string): DbModel => ({
  prismaName,
  clientAccessor: prismaName,
  tableName,
  hasCompositeId: false,
  fields: [],
});

describe('excludeModels (#623)', () => {
  const models = [model('Book'), model('ApiUsage'), model('SpatialRefSys', 'spatial_ref_sys')];

  it('excludes by Prisma model name or @@map table name', () => {
    const { included, excluded } = excludeModels(models, ['ApiUsage', 'spatial_ref_sys']);
    expect(included.map((m) => m.prismaName)).toEqual(['Book']);
    expect(excluded.map((m) => m.prismaName)).toEqual(['ApiUsage', 'SpatialRefSys']);
  });

  it('keeps everything without a list', () => {
    expect(excludeModels(models).included).toHaveLength(3);
  });
});
