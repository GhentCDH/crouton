import { toJSONSchema } from 'zod';

import { ResourceJsonShape } from '@ghentcdh/crouton-core';

// ── Settings-only subset of ResourceJsonShape ──────────────────────────
// Omit columns / actions / include — those are edited elsewhere.
const ResourceSettingsShape = ResourceJsonShape.omit({
  columns: true,
  calculatedColumns: true,
  actions: true,
  tableActions: true,
  include: true,
});

// ── JSON Schema ────────────────────────────────────────────────────────

/** Collapse a nullable `anyOf [T, null]` to its non-null branch. */
const simplifyNullableAnyOf = (
  property: Record<string, unknown>,
): boolean => {
  const anyOf = property['anyOf'];
  if (!Array.isArray(anyOf) || anyOf.length !== 2) return false;
  const nonNull = anyOf.find(
    (s: Record<string, unknown>) => s['type'] !== 'null',
  );
  const hasNull = anyOf.some(
    (s: Record<string, unknown>) => s['type'] === 'null',
  );
  if (nonNull && hasNull) {
    delete property['anyOf'];
    Object.assign(property, nonNull);
    return true;
  }
  return false;
};

/** Walk nested schemas and set additionalProperties + simplify nullable. */
const patchProperties = (properties: Record<string, any>): Set<string> => {
  const nullableKeys = new Set<string>();
  for (const key of Object.keys(properties)) {
    const prop = properties[key];
    if (simplifyNullableAnyOf(prop)) nullableKeys.add(key);
    // Recurse into nested objects
    if (prop.type === 'object' && prop.properties) {
      prop.additionalProperties = true;
      patchProperties(prop.properties);
    }
  }
  return nullableKeys;
};

export const buildResourceSettingsSchema = (): Record<string, unknown> => {
  const jsonSchema = toJSONSchema(ResourceSettingsShape, {
    unrepresentable: 'any',
    target: 'draft-07',
  }) as Record<string, any>;

  jsonSchema.additionalProperties = true;

  if (jsonSchema.properties) {
    const nullableKeys = patchProperties(jsonSchema.properties);
    if (Array.isArray(jsonSchema.required)) {
      jsonSchema.required = jsonSchema.required.filter(
        (key: string) => !nullableKeys.has(key),
      );
    }
  }

  return jsonSchema as Record<string, unknown>;
};

// ── UI Schema ──────────────────────────────────────────────────────────

const ctrl = (
  scope: string,
  options: Record<string, unknown> = {},
) => ({
  type: 'Control' as const,
  scope,
  options,
});

const displayModeOptions = [
  { label: 'Modal', value: 'modal' },
  { label: 'Page', value: 'page' },
];

const modalSizeOptions = [
  { label: 'Extra small', value: 'xs' },
  { label: 'Small', value: 'sm' },
  { label: 'Large', value: 'lg' },
  { label: 'Extra large', value: 'xl' },
];

const operationKeys = [
  'findAll',
  'findOne',
  'create',
  'update',
  'patch',
  'delete',
] as const;

export const buildResourceSettingsUiSchema = () => ({
  type: 'VerticalLayout',
  elements: [
    // ── Display settings row ──────────────────────────────────────────
    {
      type: 'HorizontalLayout',
      elements: [
        ctrl('#/properties/title', { label: 'Title' }),
        ctrl('#/properties/display/properties/mode', {
          label: 'Display mode',
          format: 'select',
          options: displayModeOptions,
        }),
        ctrl('#/properties/modalSize', {
          label: 'Modal size',
          format: 'select',
          options: modalSizeOptions,
        }),
        ctrl('#/properties/display/properties/customComponent', {
          label: 'Custom component',
        }),
      ],
    },

    // ── Sidebar + Operations ──────────────────────────────────────────
    {
      type: 'HorizontalLayout',
      elements: [
        {
          type: 'Group',
          label: 'Sidebar',
          elements: [
            {
              type: 'HorizontalLayout',
              elements: [
                ctrl('#/properties/sidebar/properties/hide', {
                  label: 'Hide',
                }),
                ctrl('#/properties/sidebar/properties/position', {
                  label: 'Position',
                }),
              ],
            },
            {
              type: 'HorizontalLayout',
              elements: [
                ctrl('#/properties/sidebar/properties/label', {
                  label: 'Label',
                }),
                ctrl('#/properties/sidebar/properties/group', {
                  label: 'Group',
                }),
              ],
            },
          ],
        },
        {
          type: 'Group',
          label: 'Operations',
          elements: [
            {
              type: 'HorizontalLayout',
              elements: operationKeys.map((op) =>
                ctrl(`#/properties/operations/properties/${op}`, {
                  label: op,
                }),
              ),
            },
          ],
        },
      ],
    },

    // ── Advanced (structural) ─────────────────────────────────────────
    {
      type: 'CollapseLayout',
      options: { title: 'Advanced (structural)' },
      elements: [
        {
          type: 'HorizontalLayout',
          elements: [
            ctrl('#/properties/name', {
              label: 'Name (id)',
              readonly: true,
            }),
            ctrl('#/properties/route', { label: 'Route' }),
            ctrl('#/properties/model', { label: 'Model (Prisma)' }),
          ],
        },
        {
          type: 'HorizontalLayout',
          elements: [
            ctrl('#/properties/tag', { label: 'Tag (OpenAPI)' }),
            ctrl('#/properties/table', { label: 'Table' }),
            ctrl('#/properties/database', { label: 'Database' }),
          ],
        },
      ],
    },
  ],
});
