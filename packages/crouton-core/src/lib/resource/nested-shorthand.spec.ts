import { describe, expect, it } from 'vitest';

import { columnTypeToJsonSchema } from './ColumnType.schema';

/**
 * `"date"` and `"date-time"` are crouton spellings, not JSON Schema types. At the
 * column level they expand via SHORTHAND_FRAGMENTS; inside a fragment `type` used
 * to pass through verbatim, so a nested
 *
 *   { "type": "object", "properties": { "when": { "type": "date" } } }
 *
 * reached the frontend as `type: "date"` — the date renderer tests `format`, the
 * string renderer tests `type === 'string'`, so nothing matched and the control
 * silently failed to render.
 */

describe('shorthand expansion inside a fragment', () => {
  it('expands a nested date', () => {
    const result = columnTypeToJsonSchema({
      type: 'object',
      properties: { when: { type: 'date' } },
    });
    expect(result.properties?.['when']).toEqual({
      type: 'string',
      format: 'date',
    });
  });

  it('expands a nested date-time', () => {
    const result = columnTypeToJsonSchema({
      type: 'object',
      properties: { seenAt: { type: 'date-time' } },
    });
    expect(result.properties?.['seenAt']).toEqual({
      type: 'string',
      format: 'date-time',
    });
  });

  it('expands inside array items, at depth', () => {
    const result = columnTypeToJsonSchema({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          member: {
            type: 'object',
            properties: { joinedOn: { type: 'date' }, name: { type: 'string' } },
          },
        },
      },
    });
    const member = result.items?.properties?.['member'];
    expect(member?.properties?.['joinedOn']).toEqual({
      type: 'string',
      format: 'date',
    });
    expect(member?.properties?.['name']).toEqual({ type: 'string' });
  });

  it('lets an explicit format win', () => {
    const result = columnTypeToJsonSchema({
      type: 'object',
      properties: { when: { type: 'date', format: 'date-time' } },
    });
    expect(result.properties?.['when']).toEqual({
      type: 'string',
      format: 'date-time',
    });
  });

  it('leaves real JSON Schema types untouched', () => {
    const result = columnTypeToJsonSchema({
      type: 'object',
      properties: {
        amount: { type: 'number', minimum: 0 },
        paid: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    });
    expect(result.properties?.['amount']).toEqual({
      type: 'number',
      minimum: 0,
    });
    expect(result.properties?.['paid']).toEqual({ type: 'boolean' });
    expect(result.properties?.['tags']).toEqual({
      type: 'array',
      items: { type: 'string' },
    });
  });

  it('keeps unknown keys, so x-* extensions survive', () => {
    const result = columnTypeToJsonSchema({
      type: 'object',
      properties: { when: { type: 'date', 'x-widget': 'calendar' } },
    } as any);
    expect(result.properties?.['when']?.['x-widget']).toBe('calendar');
  });

  it('does not hand back the config’s own nested objects', () => {
    const declared = {
      type: 'object' as const,
      properties: { name: { type: 'string' as const } },
    };
    const result = columnTypeToJsonSchema(declared);

    // Callers mutate what they get back — applySchemaTransforms adds minLength,
    // injectFieldDefaults adds default. That must not reach the resource config.
    (result.properties!['name'] as Record<string, unknown>)['minLength'] = 1;

    expect(declared.properties.name).toEqual({ type: 'string' });
  });
});
