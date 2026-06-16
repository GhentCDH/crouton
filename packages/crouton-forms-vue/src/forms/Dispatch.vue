<template>
  <component
    :is="renderer"
    v-if="renderer"
    :uischema="uischema"
    :schema="resolved"
  />
  <div
    v-else
    class="text-error text-xs"
  >
    No renderer for {{ (uischema as any).scope }} type: {{ uischema.type }}
  </div>
</template>

<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { computed, inject, provide, ref } from 'vue';

import { FORM_READONLY_KEY } from './errorMode';
import { readonlyRenderers } from './renderers';
import type { RendererEntry } from './renderers/registry';
import { findRenderer } from './renderers/registry';
import { resolveSchema } from './scope';

const props = withDefaults(
  defineProps<{
    uischema: UISchemaElement;
    schema: JsonSchema;
    pathPrefix?: string;
  }>(),
  { pathPrefix: undefined },
);

const editableRegistry = inject<RendererEntry[]>('renderers')!;
const extraReadonlyRenderers = inject<RendererEntry[]>('readonlyRenderers', []);
const formReadonly = inject(FORM_READONLY_KEY, ref(false));
const effectiveReadonlyRenderers = computed(() =>
  extraReadonlyRenderers.length
    ? [...readonlyRenderers, ...extraReadonlyRenderers]
    : readonlyRenderers,
);
const registry = computed(() =>
  formReadonly.value ? effectiveReadonlyRenderers.value : editableRegistry,
);
const rootSchema = inject<JsonSchema>('rootSchema')!;
const parentPrefix = inject<string>('pathPrefix', '');

// If pathPrefix prop is passed, provide it to children; otherwise inherit from parent
const effectivePrefix = props.pathPrefix ?? parentPrefix;
if (props.pathPrefix !== undefined) {
  provide('pathPrefix', effectivePrefix);
}

const resolved = computed(() => {
  const u = props.uischema as any;
  if (!u.scope) return props.schema;
  const fromRoot = resolveSchema(rootSchema, u.scope);
  if (fromRoot) return fromRoot;
  // Fallback: resolve against local schema (e.g. array itemSchema)
  return resolveSchema(props.schema, u.scope) ?? props.schema;
});

const renderer = computed(() =>
  findRenderer(
    registry.value as RendererEntry[],
    props.uischema,
    resolved.value,
  ),
);
</script>
