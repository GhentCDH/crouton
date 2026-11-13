import { describe, expect, it } from 'vitest';

import { withResourceTagDescriptions } from './openapi-tags';

const doc = (tags?: { name: string; description?: string }[]) =>
  ({ openapi: '3.0.0', info: { title: 't', version: '1' }, paths: {}, tags });

describe('withResourceTagDescriptions', () => {
  it('adds a description for a resource tag', () => {
    const out = withResourceTagDescriptions(doc(), [{ tag: 'Books', tagDescription: 'All books' }]);
    expect(out.tags).toEqual([{ name: 'Books', description: 'All books' }]);
  });

  it('keeps a description set through DocumentBuilder.addTag', () => {
    const out = withResourceTagDescriptions(doc([{ name: 'Books', description: 'Manual' }]), [
      { tag: 'Books', tagDescription: 'From resource' },
    ]);
    expect(out.tags).toEqual([{ name: 'Books', description: 'Manual' }]);
  });

  it('ignores resources without a description', () => {
    expect(withResourceTagDescriptions(doc(), [{ tag: 'Books' }]).tags).toEqual([]);
  });
});
