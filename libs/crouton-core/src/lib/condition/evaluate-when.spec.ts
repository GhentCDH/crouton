import { describe, expect, it } from 'vitest';

import { evaluateWhen } from './evaluate-when';

describe('evaluateWhen', () => {
  it('exists: true — truthy for non-null/non-empty, including numeric 0 and false', () => {
    expect(evaluateWhen({ field: 'id', exists: true }, { id: 1 })).toBe(true);
    expect(evaluateWhen({ field: 'id', exists: true }, { id: 'abc' })).toBe(true);
    expect(evaluateWhen({ field: 'id', exists: true }, { id: 0 })).toBe(true);
    expect(evaluateWhen({ field: 'id', exists: true }, { id: false })).toBe(true);
    expect(evaluateWhen({ field: 'id', exists: true }, { id: null })).toBe(false);
    expect(evaluateWhen({ field: 'id', exists: true }, {})).toBe(false);
    expect(evaluateWhen({ field: 'id', exists: true }, { id: '' })).toBe(false);
  });

  it('exists: false — true when value is absent', () => {
    expect(evaluateWhen({ field: 'id', exists: false }, { id: null })).toBe(true);
    expect(evaluateWhen({ field: 'id', exists: false }, { id: 1 })).toBe(false);
  });

  it('notExists: true — true when value is absent', () => {
    expect(evaluateWhen({ field: 'id', notExists: true }, {})).toBe(true);
    expect(evaluateWhen({ field: 'id', notExists: true }, { id: 0 })).toBe(false);
  });

  it('eq — strict equality', () => {
    expect(evaluateWhen({ field: 'status', eq: 'active' }, { status: 'active' })).toBe(true);
    expect(evaluateWhen({ field: 'status', eq: 'active' }, { status: 'inactive' })).toBe(false);
    expect(evaluateWhen({ field: 'n', eq: 0 }, { n: 0 })).toBe(true);
    expect(evaluateWhen({ field: 'n', eq: '0' }, { n: 0 })).toBe(false);
  });

  it('neq — strict inequality', () => {
    expect(evaluateWhen({ field: 'status', neq: 'active' }, { status: 'inactive' })).toBe(true);
    expect(evaluateWhen({ field: 'status', neq: 'active' }, { status: 'active' })).toBe(false);
  });
});
