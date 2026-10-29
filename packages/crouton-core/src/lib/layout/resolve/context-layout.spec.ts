import { describe, expect, it } from 'vitest';

import {
  collectNodeFieldIds,
  hasExplicitLayout,
  nodeFieldIdOrder,
  resolveLayoutContext,
} from './context-layout';
import { JsonColumnSchema } from '../../resource';
import { invalid } from '../../utils/test-utils';
import type { Layout } from '../schema/Layout.schema';

const col = (id: string, extra: Record<string, unknown> = {}) =>
  JsonColumnSchema.parse({ id, ...extra });

const columns = [
  col('id', { idField: true, hiddenInForm: true }),
  col('title'),
  col('notes', { hiddenInTable: true }),
];

describe('collectNodeFieldIds', () => {
  it('recurses form/view containers', () => {
    const node = invalid<never>({
      items: ['title', { type: 'collapse', items: [{ id: 'notes' }] }],
    });
    expect(nodeFieldIdOrder(node as never, 'form')).toEqual(['title', 'notes']);
    expect(collectNodeFieldIds(node as never, 'form')).toEqual(
      new Set(['title', 'notes']),
    );
  });

  it('ignores component items', () => {
    const node = invalid<never>({
      items: ['title', { component: 'MyWidget' }],
    });
    expect(nodeFieldIdOrder(node as never, 'table')).toEqual(['title']);
  });

  it('resolves the inner node of a table wrapper', () => {
    const node = invalid<never>({
      type: 'grid',
      items: [{ type: 'table', items: ['title', 'notes'] }],
    });
    expect(collectNodeFieldIds(node as never, 'table')).toEqual(
      new Set(['title', 'notes']),
    );
  });
});

describe('hasExplicitLayout', () => {
  it('is false for an absent context', () => {
    expect(hasExplicitLayout(invalid<Layout>({}), 'form')).toBe(false);
  });

  it('is false for a container-only node (no field ids)', () => {
    expect(
      hasExplicitLayout(
        invalid<Layout>({ form: { items: [{ component: 'X' }] } }),
        'form',
      ),
    ).toBe(false);
  });

  it('is true when field ids are listed', () => {
    expect(
      hasExplicitLayout(invalid<Layout>({ form: { items: ['title'] } }), 'form'),
    ).toBe(true);
  });
});

describe('resolveLayoutContext', () => {
  it('returns the explicit node when it lists fields', () => {
    const layout = invalid<Layout>({ form: { items: ['title'] } });
    expect(resolveLayoutContext(layout, columns, 'form')).toEqual({
      items: ['title'],
    });
  });

  it('falls back to flag-synthesized ids for a container-only node', () => {
    const layout = invalid<Layout>({ form: { items: [{ component: 'X' }] } });
    const resolved = resolveLayoutContext(layout, columns, 'form');
    // id is hiddenInForm, so only title/notes are synthesized
    expect(collectNodeFieldIds(resolved, 'form')).toEqual(
      new Set(['title', 'notes']),
    );
  });

  it('synthesizes from flags when the context is absent', () => {
    const resolved = resolveLayoutContext(undefined, columns, 'table');
    expect(collectNodeFieldIds(resolved, 'table')).toEqual(
      new Set(['id', 'title']),
    );
  });

  it('returns undefined when nothing is visible', () => {
    const onlyHidden = [col('a', { hiddenInForm: true })];
    expect(resolveLayoutContext(undefined, onlyHidden, 'form')).toBeUndefined();
  });
});
