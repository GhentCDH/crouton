import { describe, expect, it } from 'vitest';

import type { SecurityConfig } from '@ghentcdh/crouton-core';

import { securityFor, securityForSub } from './crud.config';
import type { Resource } from './resource/ResourceConfig.schema';
import type { SubResourceConfig } from './resource/SubResource.schema';
import type { ResourceDefinition } from './resource/defintion.schema';

const resource = (security?: SecurityConfig) =>
  ({ security }) as unknown as Resource;

describe('securityFor', () => {
  it('returns undefined when nothing is set', () => {
    const def: ResourceDefinition = {};
    expect(securityFor(resource(), def, 'findAll')).toBeUndefined();
  });

  it('returns module default when nothing else is set', () => {
    const def: ResourceDefinition = {};
    const mod: SecurityConfig = { guard: 'default' };
    expect(securityFor(resource(), def, 'findAll', mod)).toEqual({
      guard: 'default',
    });
  });

  it('resource global overrides module default', () => {
    const def: ResourceDefinition = {};
    const mod: SecurityConfig = { guard: 'default' };
    const res = resource({ guard: 'admin' });
    expect(securityFor(res, def, 'findAll', mod)).toEqual({
      guard: 'admin',
    });
  });

  it('op-level overrides resource global', () => {
    const def: ResourceDefinition = {
      findAll: { security: { public: true } },
    };
    const res = resource({ guard: 'admin' });
    expect(securityFor(res, def, 'findAll')).toEqual({ public: true });
  });

  it('op-level overrides both resource global and module default', () => {
    const def: ResourceDefinition = {
      create: { security: { guard: 'editor' } },
    };
    const res = resource({ guard: 'admin' });
    const mod: SecurityConfig = { guard: 'default' };
    expect(securityFor(res, def, 'create', mod)).toEqual({
      guard: 'editor',
    });
  });

  it('skips op when op entry is true (no security on it)', () => {
    const def: ResourceDefinition = { findOne: true };
    const res = resource({ guard: 'admin' });
    expect(securityFor(res, def, 'findOne')).toEqual({ guard: 'admin' });
  });
});

describe('securityForSub', () => {
  const sub = (ops: Record<string, unknown>) =>
    ({ operations: ops }) as unknown as SubResourceConfig;

  it('inherits parent global when sub-op has no security', () => {
    const res = resource({ guard: 'admin' });
    expect(securityForSub(res, sub({ findAll: true }), 'findAll')).toEqual({
      guard: 'admin',
    });
  });

  it('sub-op security overrides parent global', () => {
    const res = resource({ guard: 'admin' });
    const s = sub({
      findAll: { security: { public: true } },
    });
    expect(securityForSub(res, s, 'findAll')).toEqual({ public: true });
  });

  it('falls back to module default', () => {
    const res = resource();
    const mod: SecurityConfig = { guard: 'mod' };
    expect(securityForSub(res, sub({ findAll: true }), 'findAll', mod)).toEqual(
      { guard: 'mod' },
    );
  });
});
