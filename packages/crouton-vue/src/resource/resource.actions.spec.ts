import { describe, expect, it } from 'vitest';

import type { ResourceDefinition } from '@ghentcdh/crouton-core';

import { displayModeFor, resultStatus } from './resource.actions';

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

describe('resultStatus', () => {
  const messages = { successMessage: 'Sent', errorMessage: 'Not sent' };

  it('keeps configured messages first when no severity is given', () => {
    expect(resultStatus({ success: true, message: 'dyn' }, true, messages)).toEqual({ text: 'Sent', type: 'success' });
    expect(resultStatus({ success: false, message: 'dyn' }, false, messages)).toEqual({ text: 'Not sent', type: 'error' });
  });

  it('falls back to the body message without configured messages', () => {
    expect(resultStatus({ success: true, message: 'dyn' }, true, {})).toEqual({ text: 'dyn', type: 'success' });
  });

  it('lets the dynamic message win for a warning severity', () => {
    expect(resultStatus({ success: true, severity: 'warning', message: 'partial' }, true, messages))
      .toEqual({ text: 'partial', type: 'warning' });
  });

  it('lets the dynamic message win for an error severity', () => {
    expect(resultStatus({ success: false, severity: 'error', message: 'boom' }, false, messages))
      .toEqual({ text: 'boom', type: 'error' });
  });
});
