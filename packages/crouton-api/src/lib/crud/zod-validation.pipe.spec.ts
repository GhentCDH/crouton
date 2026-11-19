import { Decimal } from '@prisma/client/runtime/client';
import { describe, expect, it } from 'vitest';
import { type ZodTypeAny, z } from 'zod';

import { buildResourceDefinitions, schemaFor } from '@ghentcdh/crouton-core';
import type { JsonColumn } from '@ghentcdh/crouton-core';

import { invalid } from '../../testing/index';
import { ZodValidationPipe } from './zod-validation.pipe';

const schema = z.object({
  amount: z.instanceof(Decimal),
  label: z.string(),
});

const pipe = new ZodValidationPipe(schema);

describe('ZodValidationPipe — Decimal coercion', () => {
  it('coerces number to Decimal', () => {
    const result = pipe.transform({ amount: 80, label: 'test' });
    expect(result.amount).toBeInstanceOf(Decimal);
    expect((result.amount as Decimal).toString()).toBe('80');
  });

  it('coerces numeric string to Decimal', () => {
    const result = pipe.transform({ amount: '3.14', label: 'test' });
    expect(result.amount).toBeInstanceOf(Decimal);
    expect((result.amount as Decimal).toString()).toBe('3.14');
  });

  it('passes through existing Decimal instance', () => {
    const d = new Decimal('42.5');
    const result = pipe.transform({ amount: d, label: 'test' });
    expect(result.amount).toBeInstanceOf(Decimal);
    expect((result.amount as Decimal).toString()).toBe('42.5');
  });

  it('passes through null on nullable Decimal', () => {
    const nullableSchema = z.object({
      amount: z.instanceof(Decimal).nullable(),
      label: z.string(),
    });
    const nullablePipe = new ZodValidationPipe(nullableSchema);
    const result = nullablePipe.transform({ amount: null, label: 'test' });
    expect(result.amount).toBeNull();
  });

  it('emits validation error (not throw 500) for invalid numeric string', () => {
    expect(() => pipe.transform({ amount: 'not-a-number', label: 'test' })).toThrow();
  });

  it('leaves non-Decimal fields untouched', () => {
    const result = pipe.transform({ amount: 1, label: 'hello' });
    expect(result.label).toBe('hello');
  });

  it('PATCH: omitted Decimal field stays omitted', () => {
    const patchSchema = z.object({
      amount: z.instanceof(Decimal).optional(),
      label: z.string().optional(),
    });
    const patchPipe = new ZodValidationPipe(patchSchema);
    const result = patchPipe.transform({ label: 'only-label' });
    expect(result.amount).toBeUndefined();
    expect(result.label).toBe('only-label');
  });
});

// ── stripEmptyStrings ─────────────────────────────────────────────────────

describe('ZodValidationPipe — empty-string handling', () => {
  it('converts "" to null on nullable string field', () => {
    const s = z.object({ name: z.string().nullable() });
    const p = new ZodValidationPipe(s);
    const result = p.transform({ name: '' });
    expect(result).toEqual({ name: null });
  });

  it('converts "" to null on nullable+optional string field', () => {
    const s = z.object({ name: z.string().nullable().optional() });
    const p = new ZodValidationPipe(s);
    const result = p.transform({ name: '' });
    expect(result).toEqual({ name: null });
  });

  it('leaves "" as-is on required non-nullable string', () => {
    const s = z.object({ name: z.string() });
    const p = new ZodValidationPipe(s);
    const result = p.transform({ name: '' });
    expect(result).toEqual({ name: '' });
  });

  it('leaves "" as-is on optional non-nullable string', () => {
    const s = z.object({ name: z.string().optional() });
    const p = new ZodValidationPipe(s);
    const result = p.transform({ name: '' });
    expect(result).toEqual({ name: '' });
  });

  it('leaves "" as-is on string with min(0)', () => {
    const s = z.object({ name: z.string().min(0) });
    const p = new ZodValidationPipe(s);
    const result = p.transform({ name: '' });
    expect(result).toEqual({ name: '' });
  });

  it('rejects "" when schema has min(1)', () => {
    const s = z.object({ name: z.string().min(1) });
    const p = new ZodValidationPipe(s);
    expect(() => p.transform({ name: '' })).toThrow();
  });

  it('passes non-empty string unchanged on nullable field', () => {
    const s = z.object({ name: z.string().nullable() });
    const p = new ZodValidationPipe(s);
    const result = p.transform({ name: 'hello' });
    expect(result).toEqual({ name: 'hello' });
  });

  it('leaves non-string values untouched', () => {
    const s = z.object({ name: z.string().nullable(), count: z.number() });
    const p = new ZodValidationPipe(s);
    const result = p.transform({ name: null, count: 42 });
    expect(result).toEqual({ name: null, count: 42 });
  });
});

// #584: relation keys of a `*WithRelationsSchema` listed as columns without a
// `relation` block must not be required on create nor forwarded to Prisma.
describe('ZodValidationPipe — relation columns without relation config', () => {
  const User = z.object({ id: z.string(), name: z.string() });
  const Item = z.object({ id: z.string() });
  const Bucket = z.object({
    id: z.string(),
    title: z.string(),
    meta: z.lazy(() => z.union([z.string(), z.number()])).nullable(),
  });
  const BucketWithRelations = Bucket.merge(
    z.object({
      creator: z.lazy(() => User).nullable(),
      bucketItem: z.lazy(() => Item).array(),
    }),
  );
  const columns = ['id', 'title', 'meta', 'creator', 'bucketItem'].map(
    (id) => invalid<JsonColumn>({ id, idField: id === 'id' }),
  );
  const def = buildResourceDefinitions(
    BucketWithRelations,
    { findAll: true, findOne: true, create: true, update: true, patch: true, delete: true },
    columns,
  );

  it('create without the oneToMany key passes and drops the manyToOne key', () => {
    const p = new ZodValidationPipe(schemaFor(def, 'create') as ZodTypeAny, {
      coerceNullableUndefinedToNull: true,
    });
    const result = p.transform({ title: 'b', creator: { id: 'u', name: 'U' } });
    expect(result).toEqual({ title: 'b', meta: null });
  });

  it('update schema has no relation keys', () => {
    const shape = (schemaFor(def, 'update') as typeof Bucket).shape;
    expect(Object.keys(shape)).toEqual(['title', 'meta']);
  });
});
