import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { BaseOptionsSchema } from './base.options';
import { fieldInputRegistry } from './registry';

const getProperties = (schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> => {
  if (schema instanceof z.ZodObject) return schema.shape as Record<string, z.ZodTypeAny>;
  if (schema instanceof z.ZodUnion) {
    // Collect all properties across all variants
    const all: Record<string, z.ZodTypeAny> = {};
    for (const opt of (schema as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>).options) {
      Object.assign(all, getProperties(opt));
    }
    return all;
  }
  return {};
};

const getDescription = (schema: z.ZodTypeAny): string | undefined =>
  z.globalRegistry.get(schema)?.description as string | undefined;

describe('field-input options meta coverage', () => {
  it('every BaseOptionsSchema property has a description', () => {
    const missing: string[] = [];
    for (const [key, prop] of Object.entries(BaseOptionsSchema.shape)) {
      if (!getDescription(prop as z.ZodTypeAny)) missing.push(`base.${key}`);
    }
    expect(missing, `Missing descriptions: ${missing.join(', ')}`).toHaveLength(0);
  });

  for (const [type, def] of fieldInputRegistry) {
    it(`${type}: all type-specific options have a description`, () => {
      const baseKeys = new Set(Object.keys(BaseOptionsSchema.shape));
      const props = getProperties(def.options);
      const missing: string[] = [];
      for (const [key, prop] of Object.entries(props)) {
        if (baseKeys.has(key)) continue;
        if (!getDescription(prop as z.ZodTypeAny)) missing.push(key);
      }
      expect(missing, `Missing descriptions for ${type}: ${missing.join(', ')}`).toHaveLength(0);
    });
  }
});
