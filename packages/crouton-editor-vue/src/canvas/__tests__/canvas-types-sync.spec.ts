import { describe, expect, it } from 'vitest';

import { fieldInputRegistry } from '@ghentcdh/crouton-core';

import { CANVAS_SUPPORTED_TYPES } from '../type-swaps';

describe('CANVAS_SUPPORTED_TYPES ↔ registry sync', () => {
  it('every CANVAS_SUPPORTED_TYPES entry is a key in the fieldInputRegistry', () => {
    for (const type of CANVAS_SUPPORTED_TYPES) {
      expect(
        fieldInputRegistry.has(type),
        `CANVAS_SUPPORTED_TYPES contains "${type}" but fieldInputRegistry has no entry for it`,
      ).toBe(true);
    }
  });

  it('documents which registry keys are not yet in CANVAS_SUPPORTED_TYPES', () => {
    // These are intentionally excluded from canvas swaps (complex shape, no safe swap partner).
    // Update this list when a new type is added to both the registry AND canvas.
    const CANVAS_EXCLUDED = new Set([
      'autocomplete',
      'date',
      'dateTime',
      'date-range',
      'relation',
      'array',
      'custom',
      'Integer', // alias for number — canvas uses 'number' key instead
    ]);

    const missingFromCanvas = [...fieldInputRegistry.keys()].filter(
      (k) => !CANVAS_SUPPORTED_TYPES.has(k) && !CANVAS_EXCLUDED.has(k),
    );

    expect(
      missingFromCanvas,
      `New registry key(s) not in CANVAS_SUPPORTED_TYPES or CANVAS_EXCLUDED: ${missingFromCanvas.join(', ')}. ` +
        'Add to CANVAS_SUPPORTED_TYPES in type-swaps.ts or to CANVAS_EXCLUDED above.',
    ).toHaveLength(0);
  });
});
