// src/forms/renderers/registry.ts
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { Component } from 'vue';

export interface RendererEntry {
  tester: (
    uischema: UISchemaElement,
    schema: JsonSchema,
    context?: unknown,
  ) => number;
  renderer: Component;
}

export function findRenderer(
  registry: RendererEntry[],
  uischema: UISchemaElement,
  schema: JsonSchema,
): Component | null {
  let best: { rank: number; renderer: Component } | null = null;
  for (const entry of registry) {
    const rank = entry.tester(uischema, schema);
    if (rank > -1 && (!best || rank > best.rank)) {
      best = { rank, renderer: entry.renderer };
    }
  }
  return best?.renderer ?? null;
}
