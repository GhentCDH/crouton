import { describe, expect, it } from 'vitest';

import { resolveTableNode } from './table-node';
import { TableLayoutRootSchema } from '../schema/TableLayout.schema';

describe('resolveTableNode', () => {
  it('flat — returns node itself when no wrapper type', () => {
    const node = { items: ['a', 'b'], filterFields: [] };
    expect(resolveTableNode(node as any)).toBe(node);
  });

  it('flat — returns node when type is "table"', () => {
    const node = { type: 'table' as const, items: ['a'], filterFields: [] };
    expect(resolveTableNode(node as any)).toBe(node);
  });

  it('nested — returns the inner table node from a wrapper', () => {
    const inner = { type: 'table' as const, items: ['a'], filterFields: [] };
    const wrapper = { type: 'grid', items: [inner] };
    expect(resolveTableNode(wrapper as any)).toBe(inner);
  });

  it('none — returns undefined when layout is undefined', () => {
    expect(resolveTableNode(undefined)).toBeUndefined();
  });

  it('none — returns undefined when wrapper has no table node', () => {
    const wrapper = { type: 'grid', items: [{ component: 'MyWidget' }] };
    expect(resolveTableNode(wrapper as any)).toBeUndefined();
  });

  it('schema validates two table nodes → Zod error', () => {
    const result = TableLayoutRootSchema.safeParse({
      type: 'grid',
      items: [
        { type: 'table', items: [], filterFields: [], rowActions: [], tableActions: [] },
        { type: 'table', items: [], filterFields: [], rowActions: [], tableActions: [] },
      ],
    });
    expect(result.success).toBe(false);
    const allMessages = result.error?.issues?.map((e) => e.message).join('\n') ?? '';
    expect(allMessages).toMatch(/exactly one table node/);
  });
});
