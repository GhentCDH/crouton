import { describe, expect, it } from 'vitest';

import { type SidebarNode, routeOfLeaf } from './sidebar';

/** #548 — the app addresses resources by `name`, the API mounts them at `route`. */
describe('routeOfLeaf', () => {
  const sidebar: SidebarNode[] = [
    { kind: 'item', id: 'annotatedText', route: 'annotated-text', label: 'Annotated text' },
    { kind: 'item', id: 'book', route: 'book', label: 'Book' },
    {
      kind: 'group',
      id: 'catalogue',
      label: 'Catalogue',
      children: [{ kind: 'item', id: 'zotero_item', route: 'zotero-items', label: 'Zotero' }],
    },
    { kind: 'item', id: 'legacy', label: 'Legacy (no route from older backend)' },
  ];

  it('maps a top-level leaf name to its route', () => {
    expect(routeOfLeaf(sidebar, 'annotatedText')).toBe('annotated-text');
  });

  it('maps a grouped leaf name to its route', () => {
    expect(routeOfLeaf(sidebar, 'zotero_item')).toBe('zotero-items');
  });

  it('keeps the id when route equals name or is missing', () => {
    expect(routeOfLeaf(sidebar, 'book')).toBe('book');
    expect(routeOfLeaf(sidebar, 'legacy')).toBe('legacy');
  });

  it('passes through ids that are not sidebar leaves (already a route)', () => {
    expect(routeOfLeaf(sidebar, 'annotated-text')).toBe('annotated-text');
  });
});
