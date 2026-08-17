<template>
  <div class="flex flex-col gap-1">
    <label v-if="!hideLabel" class="text-sm font-medium">{{ label }}</label>

    <!--
      A displayKey names the one meaningful key, so the object is identifying
      context rather than something to edit — render it as text. Same rule the
      table (RecordCell) and the readonly view already follow.
    -->
    <span v-if="displayValue !== null" class="text-sm">{{ displayValue }}</span>

    <div
      v-else-if="childElements.length"
      class="grid grid-cols-12 gap-2 rounded-box border border-base-300 p-2"
    >
      <div
        v-for="(child, index) in childElements"
        :key="index"
        :class="colspanClass(child)"
      >
        <Dispatch
          :uischema="child"
          :schema="objectSchema"
          :path-prefix="path"
        />
      </div>
    </div>
    <div v-else class="text-sm text-base-content/50">
      No properties declared for {{ label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { useFormContext } from 'vee-validate';
import { computed, inject } from 'vue';

import Dispatch from '../../Dispatch.vue';
import { resolveSchema, scopeToPath } from '../../scope';

/**
 * Renders a column whose schema is a nested object.
 *
 * Two modes:
 * - **`displayKey` set** — the object identifies something (a `{id, name}`
 *   member, a lookup row) rather than being editable. Renders that one key as
 *   text, matching what `RecordCell` does in the table and `ObjectValue` in the
 *   readonly view.
 * - **otherwise** — one control per declared property.
 *
 * Built the same way as `ArrayRenderer`: resolve the sub-schema, provide a
 * `pathPrefix` so children bind to dotted paths (`metadata.name`), and
 * re-dispatch. The backend can supply explicit `elements` for full control over
 * ordering and widgets; otherwise a control is synthesised per property.
 */
const props = defineProps<{
  uischema: UISchemaElement;
  schema: JsonSchema;
}>();

const parentPrefix = inject<string>('pathPrefix', '');
const scope = (props.uischema as any).scope as string;
const scopePath = scopeToPath(scope);
const path = parentPrefix ? `${parentPrefix}.${scopePath}` : scopePath;

const rootSchema = inject<JsonSchema>('rootSchema', props.schema);
const objectSchema = computed<JsonSchema>(
  () =>
    (resolveSchema(rootSchema, scope) ??
      resolveSchema(props.schema, scope) ??
      props.schema) as JsonSchema,
);

const opts = computed(
  () => ((props.uischema as any).options ?? {}) as Record<string, any>,
);
const hideLabel = computed(() => opts.value.hideLabel === true);
const label = computed(() => opts.value.label ?? scopePath);

const { values: formValues } = useFormContext();

/** Resolve a dotted path against an object, tolerating gaps. */
const atPath = (source: unknown, dotted: string): unknown =>
  dotted
    .split('.')
    .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), source);

/**
 * The `displayKey`'s value, or `null` when there is no displayKey — which is
 * what switches this renderer into "edit the properties" mode.
 */
const displayValue = computed<string | null>(() => {
  const displayKey = opts.value.displayKey;
  if (typeof displayKey !== 'string' || !displayKey) return null;
  const resolved = atPath(atPath(formValues, path), displayKey);
  return resolved === null || resolved === undefined ? '—' : String(resolved);
});

/**
 * One `Control` per declared property, unless the ui schema already carries
 * `elements` — in which case the author's ordering and widget choices win.
 */
const childElements = computed<UISchemaElement[]>(() => {
  const explicit = (props.uischema as any).elements as
    | UISchemaElement[]
    | undefined;
  if (explicit?.length) return explicit;

  const properties = (objectSchema.value as any)?.properties as
    | Record<string, JsonSchema>
    | undefined;
  if (!properties) return [];

  return Object.keys(properties).map(
    (key) =>
      ({
        type: 'Control',
        scope: `#/properties/${key}`,
        options: { label: (properties[key] as any)?.title ?? key },
      }) as UISchemaElement,
  );
});

const colspanClass = (child: UISchemaElement): string => {
  const colspan = ((child as any).options ?? {}).colspan;
  return typeof colspan === 'number' ? `col-span-${colspan}` : 'col-span-12';
};
</script>
