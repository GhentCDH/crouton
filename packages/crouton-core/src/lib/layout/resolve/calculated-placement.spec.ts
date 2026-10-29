import { describe, expect, it } from 'vitest';

import { resolveCalculatedPlacement } from './calculated-placement';
import { JsonColumnSchema } from '../../resource';
import type { CalculatedColumn } from '../../resource/CalculatedColumn.schema';
import { invalid } from '../../utils/test-utils';
import type { Layout } from '../schema/Layout.schema';

const col = (id: string, extra: Record<string, unknown> = {}) =>
  JsonColumnSchema.parse({ id, ...extra });

const calc = (id: string, extra: Record<string, unknown> = {}) =>
  invalid<CalculatedColumn>({ id, alias: id, label: id, sqlExpression: '1', type: 'string', ...extra });

const regularColumns = [col('id', { idField: true }), col('title')];

describe('resolveCalculatedPlacement', () => {
  it('uses the explicit layout order; unlisted calculated columns are dropped', () => {
    const placement = resolveCalculatedPlacement(
      invalid<Layout>({ table: { items: ['title', 'count'] } }),
      regularColumns,
      [calc('count')],
      'table',
    );
    expect(placement.order).toEqual(['title', 'count']);
  });

  it('omits a calculated column the explicit layout does not list', () => {
    const placement = resolveCalculatedPlacement(
      invalid<Layout>({ table: { items: ['title'] } }),
      regularColumns,
      [calc('count')],
      'table',
    );
    expect(placement.order).not.toContain('count');
  });

  it('falls back to flags when there is no layout', () => {
    const placement = resolveCalculatedPlacement(undefined, regularColumns, [calc('count')], 'table');
    expect(placement.order).toContain('count');
  });

  it('excludes a hidden calculated column from the no-layout fallback', () => {
    const placement = resolveCalculatedPlacement(
      undefined,
      regularColumns,
      [calc('count', { hiddenInView: true })],
      'view',
    );
    expect(placement.order).not.toContain('count');
  });

  it('positions a no-layout calculated column by fieldInput.position', () => {
    const placement = resolveCalculatedPlacement(
      undefined,
      regularColumns,
      [calc('count', { fieldInput: { position: 0 } })],
      'table',
    );
    expect(placement.order[0]).toBe('count');
  });
});
