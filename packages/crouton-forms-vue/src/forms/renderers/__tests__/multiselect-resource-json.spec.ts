import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';

import { JsonColumnSchema, buildFormControl } from '@ghentcdh/crouton-core';

import MultiSelectControlRenderer from '../controls/MultiSelectControlRenderer.vue';
import { customRenderers } from '../index';

/**
 * #554 — a resource.json column with `fieldInput.type: "multiSelect"` on an
 * array column must pick the multi-select renderer, not the generic array
 * editor. Goes through the real server-side builder (crouton-core) and the
 * full renderer registry, so a format/tester mismatch or rank regression fails.
 */
const pickRenderer = (uischema: UISchemaElement, schema: JsonSchema) => {
  const rootSchema = { type: 'object', properties: { apps: schema } } as JsonSchema;
  const ranked = customRenderers.map((r) => ({
    renderer: r.renderer,
    rank: r.tester(uischema, rootSchema.properties?.['apps'] ?? schema, { rootSchema, config: {} }),
  }));
  return ranked.sort((a, b) => b.rank - a.rank)[0];
};

describe('multiSelect from resource.json (#554)', () => {
  const col = JsonColumnSchema.parse({
    id: 'apps',
    type: { type: 'array', items: { type: 'string' } },
    fieldInput: { type: 'multiSelect', options: { values: [{ value: 'a', label: 'A' }] } },
  });
  const uischema = buildFormControl(col).build() as UISchemaElement & { options?: Record<string, unknown> };

  it('server emits format multiSelect and forwards options.values', () => {
    expect(uischema.options?.['format']).toBe('multiSelect');
    expect(uischema.options?.['values']).toEqual([{ value: 'a', label: 'A' }]);
  });

  it('array column renders with MultiSelectControlRenderer, not the array editor', () => {
    const best = pickRenderer(uischema, { type: 'array', items: { type: 'string' } });
    expect(best.renderer).toBe(MultiSelectControlRenderer);
  });
});
