import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { fieldInputRegistry } from '@ghentcdh/crouton-core';

import { AUTOCOMPLETE_OPTION_KEYS, SELECT_OPTION_KEYS } from '../useSelectBinding';

const RENDERER_ALLOWLISTS: Record<string, readonly string[]> = {
  select: SELECT_OPTION_KEYS,
  mutliSelect: SELECT_OPTION_KEYS,
  autocomplete: AUTOCOMPLETE_OPTION_KEYS,
};

describe('field-input schema drift check', () => {
  for (const [type, consumedKeys] of Object.entries(RENDERER_ALLOWLISTS)) {
    it(`${type}: all consumed keys exist in the Zod schema`, () => {
      const def = fieldInputRegistry.get(type);
      expect(def, `${type} missing from fieldInputRegistry`).toBeDefined();

      if (!(def!.options instanceof z.ZodObject)) return; // union types — skip shape check

      const schemaKeys = new Set(Object.keys(def!.options.shape));
      const missing = consumedKeys.filter((k) => !schemaKeys.has(k));
      expect(
        missing,
        `Renderer for '${type}' consumes keys not in schema: ${missing.join(', ')}`,
      ).toHaveLength(0);
    });
  }
});
