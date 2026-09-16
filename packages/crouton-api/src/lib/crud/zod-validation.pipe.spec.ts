import { Decimal } from '@prisma/client/runtime/client';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe';

const schema = z.object({
  amount: z.instanceof(Decimal),
  label: z.string(),
});

const pipe = new ZodValidationPipe(schema as any);

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
    const nullablePipe = new ZodValidationPipe(nullableSchema as any);
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
    const patchPipe = new ZodValidationPipe(patchSchema as any);
    const result = patchPipe.transform({ label: 'only-label' });
    expect(result.amount).toBeUndefined();
    expect(result.label).toBe('only-label');
  });
});
