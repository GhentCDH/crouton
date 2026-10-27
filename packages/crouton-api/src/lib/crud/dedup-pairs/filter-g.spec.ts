/**
 * Phase 0 pair spec — item G.
 *
 * `parseFilterString` (crouton-api) vs `stringToFilter` (crouton-core private
 * `getFilterValues`, exposed through the exported `stringToFilter`).
 *
 * Documents the known differences so phases 1+ can unify to the api semantics.
 */
import { describe, expect, it } from 'vitest';

import { stringToFilter } from '@ghentcdh/crouton-core';

import { parseFilterString } from '../data-access/query/filter';

describe('G: filter string parsing — core (stringToFilter) vs api (parseFilterString)', () => {
  describe('identical behaviour', () => {
    it('field:value — default contains operator', () => {
      const core = stringToFilter('title:hello');
      const api = parseFilterString('title:hello');
      expect(core.key).toBe('title');
      expect(api?.field).toBe('title');
      expect(core.value).toBe('hello');
      expect(api?.value).toBe('hello');
      expect(core.operator).toBe('contains');
      expect(api?.operator).toBe('contains');
    });

    it('field:value:equals — explicit operator', () => {
      const core = stringToFilter('status:active:equals');
      const api = parseFilterString('status:active:equals');
      expect(core.operator).toBe('equals');
      expect(api?.operator).toBe('equals');
      expect(core.value).toBe('active');
      expect(api?.value).toBe('active');
    });

    it('value with colon (field:a:b:contains)', () => {
      const core = stringToFilter('url:a:b:contains');
      const api = parseFilterString('url:a:b:contains');
      expect(core.value).toBe('a:b');
      expect(api?.value).toBe('a:b');
    });
  });

  describe('known differences (behaviour picks for phase 1)', () => {
    it('empty field — core returns {key:"", ...}, api returns null', () => {
      // Core never returns null
      const core = stringToFilter(':value');
      expect(core.key).toBe('');
      expect(core.value).toBe('value');

      // Api guards against empty field
      const api = parseFilterString(':value');
      expect(api).toBeNull();
    });

    it('field:op — two parts — known difference in operator detection', () => {
      // Core: parts.length >= 3 required for operator detection.
      // 'title:contains' has length=2 → hasOp=false → 'contains' treated as value.
      const core = stringToFilter('title:contains');
      expect(core.key).toBe('title');
      expect(core.operator).toBe('contains'); // default
      expect(core.value).toBe('contains');   // 'contains' is the value, not the operator

      // Api: detects operator with just 2 parts when lastPart is a known operator.
      // 'title:contains' → hasOperator=true → operator='contains', value=''
      const api = parseFilterString('title:contains');
      expect(api?.field).toBe('title');
      expect(api?.operator).toBe('contains');
      expect(api?.value).toBe(''); // empty — the operator was consumed

      // DIFFERENCE: core.value='contains' (unrecognised as op), api.value=''
    });

    it('return shape: core uses {key} api uses {field}', () => {
      const core = stringToFilter('title:hello');
      const api = parseFilterString('title:hello');
      // Core shape: { key, value, operator, label? }
      expect('key' in core).toBe(true);
      expect('field' in core).toBe(false);
      // Api shape: { field, value, operator }
      expect('field' in (api ?? {})).toBe(true);
      expect('key' in (api ?? {})).toBe(false);
    });
  });
});
