import { describe, expect, it } from 'vitest';

import { resolveColumnVisibility } from './layout-visibility';
import type { JsonColumn } from '../resource/Column';

const cols = (ids: string[]): JsonColumn[] =>
  ids.map((id) => ({ id, type: 'string' } as JsonColumn));

describe('resolveColumnVisibility — container-only layout node (#242)', () => {
  it('layout.view with only container and no items does not hide any columns', () => {
    const columns = cols(['title', 'body', 'status']);
    const result = resolveColumnVisibility(columns, {
      view: { container: { mode: 'modal', size: 'xl' } } as any,
    });
    expect(result.every((c) => !c.hiddenInView)).toBe(true);
  });

  it('layout.form with only container and no items does not hide any columns', () => {
    const columns = cols(['title', 'body']);
    const result = resolveColumnVisibility(columns, {
      form: { container: { mode: 'modal' } } as any,
    });
    expect(result.every((c) => !c.hiddenInForm)).toBe(true);
  });

  it('layout.view with items still hides unlisted columns', () => {
    const columns = cols(['title', 'body', 'status']);
    const result = resolveColumnVisibility(columns, {
      view: { items: ['title'] } as any,
    });
    expect(result.find((c) => c.id === 'title')?.hiddenInView).toBe(false);
    expect(result.find((c) => c.id === 'body')?.hiddenInView).toBe(true);
    expect(result.find((c) => c.id === 'status')?.hiddenInView).toBe(true);
  });
});
