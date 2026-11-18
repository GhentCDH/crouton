import { describe, expect, it } from 'vitest';

import { invalid } from '../../../testing/index';
import type { Resource } from '../resource/ResourceConfig.schema';
import { buildLayoutPayload } from './app-layout.builder';

const resource = (name: string, route: string, group?: string) =>
  invalid<Resource>({ name, route, tag: name, views: { table: {} }, ...(group && { sidebar: { group } }) });

/** #548 — sidebar leaves must carry the API route when it differs from `name`. */
describe('buildLayoutPayload sidebar leaves', () => {
  it('keeps name as id and adds route', () => {
    const { sidebar } = buildLayoutPayload([resource('annotatedText', 'annotated-text')]);
    expect(sidebar).toEqual([expect.objectContaining({ id: 'annotatedText', route: 'annotated-text' })]);
  });

  it('adds route to grouped leaves too', () => {
    const { sidebar } = buildLayoutPayload([resource('zotero_item', 'zotero-items', 'catalogue')]);
    expect(sidebar[0]).toMatchObject({
      kind: 'group',
      children: [expect.objectContaining({ id: 'zotero_item', route: 'zotero-items' })],
    });
  });
});
