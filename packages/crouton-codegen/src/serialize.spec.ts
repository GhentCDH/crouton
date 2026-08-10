import { describe, expect, it } from 'vitest';

import { CURRENT_RESOURCE_VERSION } from '@ghentcdh/crouton-core';

import {
  RESOURCE_SCHEMA_URL,
  serializeResourceJson,
  withResourceHeader,
} from './serialize';

const base = {
  name: 'author',
  route: 'author',
  model: 'Author',
  tag: 'author',
  operations: {},
} as any;

describe('withResourceHeader', () => {
  it('leads with $schema then schemaVersion (current)', () => {
    const out = withResourceHeader(base);
    const keys = Object.keys(out);
    expect(keys[0]).toBe('$schema');
    expect(keys[1]).toBe('schemaVersion');
    expect(out.$schema).toBe(RESOURCE_SCHEMA_URL);
    expect(out.schemaVersion).toBe(CURRENT_RESOURCE_VERSION);
  });

  it('re-stamps stale $schema/schemaVersion to current', () => {
    const out = withResourceHeader({
      ...base,
      $schema: 'https://old/v0/resource.schema.json',
      schemaVersion: 0,
    } as any);
    expect(out.$schema).toBe(RESOURCE_SCHEMA_URL);
    expect(out.schemaVersion).toBe(CURRENT_RESOURCE_VERSION);
  });

  it('sets draft from opts (new-resource default path)', () => {
    expect(withResourceHeader(base, { draft: true }).draft).toBe(true);
    expect(withResourceHeader(base, { draft: false }).draft).toBe(false);
  });

  it('preserves an existing draft when opts.draft is omitted (update path)', () => {
    expect(withResourceHeader({ ...base, draft: true } as any).draft).toBe(true);
    expect('draft' in withResourceHeader(base)).toBe(false); // none present → no key
  });
});

describe('serializeResourceJson', () => {
  it('is 2-space JSON with a trailing newline, $schema first', () => {
    const text = serializeResourceJson(withResourceHeader(base, { draft: true }));
    expect(text.endsWith('\n')).toBe(true);
    expect(text.startsWith('{\n  "$schema"')).toBe(true);
    expect(JSON.parse(text).schemaVersion).toBe(CURRENT_RESOURCE_VERSION);
  });
});
