import { describe, expect, it } from 'vitest';

import { resolveFieldControl } from './resolve-field';
import type { JsonColumn } from '../../resource/Column';

const col = (id: string, extra: Partial<JsonColumn> = {}): JsonColumn =>
  ({ id, hiddenInTable: false, hiddenInForm: false, hiddenInView: false, ...extra } as JsonColumn);

describe('resolveFieldControl', () => {
  it('returns {} for bare string item', () => {
    expect(resolveFieldControl(col('name'), 'name')).toEqual({});
  });

  it('returns {} for component item', () => {
    expect(resolveFieldControl(col('name'), { component: 'MyWidget' } as any)).toEqual({});
  });

  it('item.label wins over fieldInput.options.label', () => {
    const c = col('name', { fieldInput: { type: 'text', options: { label: 'col label' } } } as any);
    const result = resolveFieldControl(c, { id: 'name', label: 'item label' });
    expect(result.label).toBe('item label');
  });

  it('falls back to fieldInput.options.label when item has no label', () => {
    const c = col('name', { fieldInput: { type: 'text', options: { label: 'col label' } } } as any);
    const result = resolveFieldControl(c, { id: 'name' });
    expect(result.label).toBe('col label');
  });

  it('item.hideLabel wins over fieldInput.options.hideLabel', () => {
    const c = col('name', { fieldInput: { type: 'text', options: { hideLabel: true } } } as any);
    const result = resolveFieldControl(c, { id: 'name', hideLabel: false });
    expect(result.hideLabel).toBe(false);
  });

  it('item.type and options set directly (no column fallback)', () => {
    const c = col('name', { fieldInput: { type: 'text' } } as any);
    const result = resolveFieldControl(c, { id: 'name', type: 'textarea', options: { rows: 5 } });
    expect(result.type).toBe('textarea');
    expect(result.options).toEqual({ rows: 5 });
  });

  it('item.colspan wins over fieldInput.options.colspan', () => {
    const c = col('name', { fieldInput: { type: 'text', options: { colspan: 6 } } } as any);
    expect(resolveFieldControl(c, { id: 'name', colspan: 4 }).colspan).toBe(4);
  });

  it('falls back to fieldInput.options.colspan', () => {
    const c = col('name', { fieldInput: { type: 'text', options: { colspan: 6 } } } as any);
    expect(resolveFieldControl(c, { id: 'name' }).colspan).toBe(6);
  });

  it('item.width wins over fieldInput.options.width', () => {
    const c = col('name', { fieldInput: { type: 'text', options: { width: '50%' } } } as any);
    expect(resolveFieldControl(c, { id: 'name', width: '100px' }).width).toBe('100px');
  });

  it('passes through showWhen/hideWhen/disabledWhen', () => {
    const cond = { field: 'active', eq: true };
    const result = resolveFieldControl(col('name'), { id: 'name', showWhen: cond } as any);
    expect(result.showWhen).toEqual(cond);
    expect(result.hideWhen).toBeUndefined();
    expect(result.disabledWhen).toBeUndefined();
  });

  it('returns undefined for absent optional fields when column has no options', () => {
    const result = resolveFieldControl(col('name'), { id: 'name' });
    expect(result.label).toBeUndefined();
    expect(result.hideLabel).toBeUndefined();
    expect(result.colspan).toBeUndefined();
    expect(result.rowspan).toBeUndefined();
    expect(result.width).toBeUndefined();
  });
});
