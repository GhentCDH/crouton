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

const columns = [col('id', { idField: true }), col('title')];

describe('resolveCalculatedPlacement', () => {
  it('uses the explicit layout order; unlisted calculated columns are dropped', () => {
    const placement = resolveCalculatedPlacement(
      invalid<Layout>({ table: { items: ['title', 'count'] } }),
      [...columns, col('count', { computed: { sql: '1' } })],
      [calc('count')],
      'table',
    );
    expect(placement.order).toEqual(['title', 'count']);
  });

  it('omits a calculated column the explicit layout does not list', () => {
    const placement = resolveCalculatedPlacement(
      invalid<Layout>({ table: { items: ['title'] } }),
      [...columns, col('count', { computed: { sql: '1' } })],
      [calc('count')],
      'table',
    );
    expect(placement.order).not.toContain('count');
  });

  it('falls back to the column flags when there is no layout', () => {
    const placement = resolveCalculatedPlacement(
      undefined,
      [...columns, col('count', { computed: { sql: '1' } })],
      [calc('count')],
      'table',
    );
    expect(placement.order).toContain('count');
  });

  it('excludes a computed column hidden via its column flag from the fallback', () => {
    const placement = resolveCalculatedPlacement(
      undefined,
      [...columns, col('count', { computed: { sql: '1' }, hiddenInView: true })],
      [calc('count')],
      'view',
    );
    expect(placement.order).not.toContain('count');
  });

  it('positions a no-layout computed column by fieldInput.position', () => {
    const placement = resolveCalculatedPlacement(
      undefined,
      [...columns, col('count', { computed: { sql: '1' }, fieldInput: { position: 0 } })],
      [calc('count')],
      'table',
    );
    expect(placement.order[0]).toBe('count');
  });

  it('always includes a legacy top-level calculated column in the fallback', () => {
    // Top-level calculatedColumns is deprecated and carries no visibility control;
    // entries not shadowed by a computed column are always visible.
    const placement = resolveCalculatedPlacement(undefined, columns, [calc('count')], 'table');
    expect(placement.order).toContain('count');
  });

  it('resolves a shadowed legacy entry through the computed column flags instead', () => {
    // A computed column with the same id wins over the legacy entry: the column
    // flag hides it even though legacy entries are otherwise always visible.
    const placement = resolveCalculatedPlacement(
      undefined,
      [...columns, col('count', { computed: { sql: '1' }, hiddenInView: true })],
      [calc('count')],
      'view',
    );
    expect(placement.order).not.toContain('count');
  });
});
