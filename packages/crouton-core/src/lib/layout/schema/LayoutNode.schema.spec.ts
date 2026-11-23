import { describe, expect, it } from 'vitest';

import { LayoutSchema } from './Layout.schema';
import { isComponentItem, isNodeItem } from './LayoutItem.schema';
import { FormLayoutNodeSchema } from './LayoutNode.schema';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';


describe('custom layout node', () => {
  const custom = { type: 'custom', component: 'Tabs', props: { a: 1 }, items: [{ type: 'group', items: ['x'] }] };

  it('parses as a node and keeps its items', () => {
    const parsed = FormLayoutNodeSchema.parse({ items: [custom] });
    expect(parsed.items?.[0]).toEqual(custom);
  });

  it('keeps a plain component item a component item', () => {
    const parsed = FormLayoutNodeSchema.parse({ items: [{ component: 'LoanList' }] });
    expect(parsed.items?.[0]).toMatchObject({ component: 'LoanList', colspan: 12 });
  });

  it('requires component on a custom node', () => {
    expect(FormLayoutNodeSchema.safeParse({ type: 'custom', items: [] }).success).toBe(false);
  });

  it('guards treat a custom node as a node', () => {
    expect(isNodeItem(custom)).toBe(true);
    expect(isComponentItem(custom)).toBe(false);
    expect(isComponentItem({ component: 'X' })).toBe(true);
  });

  it('survives the layout parse (form + view roots)', () => {
    const json = JSON.parse(
      readFileSync(resolve(__dirname, '../__fixtures__/custom-layout.resource.json'), 'utf-8'),
    ) as { layout: unknown };
    const parsed = LayoutSchema.parse(json.layout);
    const tabs = parsed.form?.items?.[0] as Record<string, unknown>;
    expect(tabs).toMatchObject({ type: 'custom', component: 'Tabs', props: { syncQuery: 'tab' } });
    expect((tabs['items'] as unknown[]).length).toBe(2);
    expect(parsed.view?.items?.[0]).toMatchObject({ type: 'custom', component: 'Tabs' });
  });
});
