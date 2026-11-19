import { describe, expect, it } from 'vitest';
import { type ZodObject, type ZodRawShape, z } from 'zod';

import { invalid } from '../../../testing/index';
import type { JsonColumn } from '../../resource';
import { buildResourceDefinitions } from './schema.helpers';

const model = z.object({
  id: z.number(),
  name: z.string(),
  source: z.enum(['MANUAL', 'GOOGLE']),
  sortOrder: z.number(),
  createdAt: z.coerce.date(),
  owner: z.string(),
});

const columns = invalid<JsonColumn[]>([
  { id: 'id', idField: true },
  { id: 'name' },
  { id: 'source', fieldInput: { type: 'select', defaultValue: 'MANUAL' } },
  { id: 'sortOrder', fieldInput: { type: 'number', defaultValue: 0 } },
  { id: 'createdAt', fieldInput: { type: 'date', defaultValue: '$now' } },
  { id: 'owner', fieldInput: { type: 'text', defaultValue: '$user' } },
]);

const schemaOf = (op: unknown) =>
  invalid<{ schema: ZodObject<ZodRawShape> }>(op).schema;

describe('buildResourceDefinitions – defaulted fields', () => {
  const def = buildResourceDefinitions(
    model,
    { create: true, update: true },
    columns,
  );

  const create = (body: Record<string, unknown>) =>
    schemaOf(def.create).safeParse({ owner: 'me', ...body });

  it('create fills in literal defaults when omitted', () => {
    const result = create({ name: 'x' });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ source: 'MANUAL', sortOrder: 0 });
  });

  it('create keeps an explicit client value over the default', () => {
    expect(create({ name: 'x', source: 'GOOGLE', sortOrder: 3 }).data).toMatchObject({
      source: 'GOOGLE',
      sortOrder: 3,
    });
  });

  it('create evaluates $now at parse time', () => {
    const before = Date.now();
    const createdAt = create({ name: 'x' }).data?.['createdAt'];
    expect(createdAt).toBeInstanceOf(Date);
    expect(invalid<Date>(createdAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it('create keeps a $user default required (no server-side resolution)', () => {
    expect(schemaOf(def.create).safeParse({ name: 'x' }).success).toBe(false);
  });

  it('create still requires fields without a default', () => {
    expect(create({ source: 'MANUAL' }).success).toBe(false);
  });

  it('update keeps defaulted fields required', () => {
    expect(
      schemaOf(def.update).safeParse({ name: 'x', owner: 'me', createdAt: new Date() }).success,
    ).toBe(false);
  });
});
