import { describe, expect, it } from 'vitest';

import type { ResourceDefinition } from '@ghentcdh/crouton-core';

import { displayModeFor } from './resource.actions';

const display = (
  form: 'page' | 'modal',
  view: 'page' | 'modal',
): ResourceDefinition['display'] =>
  ({
    form: { mode: form },
    view: { mode: view, customComponent: null },
  }) as ResourceDefinition['display'];

describe('displayModeFor', () => {
  it('reads the form mode in the form context', () => {
    expect(displayModeFor(display('page', 'modal'), 'form')).toBe('page');
  });

  it('reads the view mode in the view context', () => {
    expect(displayModeFor(display('page', 'modal'), 'view')).toBe('modal');
  });

  it('keeps the two contexts independent (form modal, view page)', () => {
    expect(displayModeFor(display('modal', 'page'), 'form')).toBe('modal');
    expect(displayModeFor(display('modal', 'page'), 'view')).toBe('page');
  });
});
