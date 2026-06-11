import { describe, expect, it } from 'vitest';

import { replaceUriParams } from './uri.utils';

describe('replaceUriParams', () => {
  it('should replace simple params', () => {
    const result = replaceUriParams('/api/{id}', { id: '42' });
    expect(result).toBe('/api/42');
  });

  it('should replace multiple params', () => {
    const result = replaceUriParams('/api/{resource}/{id}', {
      resource: 'text',
      id: '7',
    });
    expect(result).toBe('/api/text/7');
  });

  it('should replace nested dot-notation params', () => {
    const result = replaceUriParams(
      'http://localhost:3000/text/{parent.id}/content/{id}',
      { parent: { id: 'some-id' }, id: 'other-id' },
    );
    expect(result).toBe(
      'http://localhost:3000/text/some-id/content/other-id',
    );
  });

  it('should handle deeply nested params', () => {
    const result = replaceUriParams('/api/{a.b.c}', {
      a: { b: { c: 'deep' } },
    });
    expect(result).toBe('/api/deep');
  });

  it('should leave unresolved placeholders as-is', () => {
    const result = replaceUriParams('/api/{missing}', {});
    expect(result).toBe('/api/{missing}');
  });

  it('should leave unresolved nested placeholders as-is', () => {
    const result = replaceUriParams('/api/{parent.missing}', {
      parent: {},
    });
    expect(result).toBe('/api/{parent.missing}');
  });

  it('should convert numeric values to strings', () => {
    const result = replaceUriParams('/api/{id}', { id: 123 });
    expect(result).toBe('/api/123');
  });

  it('should return uri unchanged when no placeholders', () => {
    const result = replaceUriParams('/api/static', { id: '1' });
    expect(result).toBe('/api/static');
  });
});