import { describe, expect, it } from 'vitest';

import { buildResourceOperations } from './payload-builders';

const baseUri = 'http://host/annotation';

describe('buildResourceOperations — external uri', () => {
  it('uses crouton route for normal ops', () => {
    const def = { findAll: true, delete: true };
    const ops = buildResourceOperations(def as any, baseUri);
    expect(ops['findAll']).toEqual({ uri: baseUri, method: 'get' });
    expect(ops['delete']).toEqual({ uri: `${baseUri}/{id}`, method: 'delete' });
  });

  it('uses external uri for an external op', () => {
    const def = { findAll: true, delete: { uri: '/legacy/annotation/{id}' } };
    const ops = buildResourceOperations(def as any, baseUri);
    expect(ops['findAll']).toEqual({ uri: baseUri, method: 'get' });
    expect(ops['delete']).toEqual({ uri: '/legacy/annotation/{id}', method: 'delete' });
  });

  it('uses method override from external op when provided', () => {
    const def = { delete: { uri: '/legacy/annotation/{id}', method: 'put' } };
    const ops = buildResourceOperations(def as any, baseUri);
    expect(ops['delete']).toEqual({ uri: '/legacy/annotation/{id}', method: 'put' });
  });

  it('resolves {env.X} in external uris', () => {
    process.env['ANNOTATION_API'] = 'https://legacy.example.com';
    const def = { delete: { uri: '{env.ANNOTATION_API}/annotation/{id}' } };
    const ops = buildResourceOperations(def as any, baseUri);
    expect(ops['delete']).toEqual({ uri: 'https://legacy.example.com/annotation/{id}', method: 'delete' });
    delete process.env['ANNOTATION_API'];
  });
});
