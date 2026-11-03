import { describe, expect, it } from 'vitest';

import { evaluateGuard } from './guards';

describe('evaluateGuard — array shorthand (anyOf)', () => {
  it('passes when role matches', () => expect(evaluateGuard(['admin'], ['admin'])).toBe(true));
  it('fails when role absent', () => expect(evaluateGuard(['admin'], ['user'])).toBe(false));
  it('fails on empty roles', () => expect(evaluateGuard(['admin'], [])).toBe(false));
  it('passes on any matching role', () => expect(evaluateGuard(['editor', 'admin'], ['admin'])).toBe(true));
});

describe('evaluateGuard — anyOf object', () => {
  it('passes when one role matches', () => expect(evaluateGuard({ anyOf: ['editor', 'admin'] }, ['admin'])).toBe(true));
  it('fails when no role matches', () => expect(evaluateGuard({ anyOf: ['editor', 'admin'] }, ['viewer'])).toBe(false));
});

describe('evaluateGuard — allOf object', () => {
  it('passes when all roles present', () => expect(evaluateGuard({ allOf: ['editor', 'admin'] }, ['editor', 'admin'])).toBe(true));
  it('fails when one role missing', () => expect(evaluateGuard({ allOf: ['editor', 'admin'] }, ['editor'])).toBe(false));
  it('fails on empty roles', () => expect(evaluateGuard({ allOf: ['editor'] }, [])).toBe(false));
});

describe('evaluateGuard — anyOf + allOf combined', () => {
  it('passes only when both conditions hold', () => {
    const guard = { anyOf: ['editor'], allOf: ['reviewer'] };
    expect(evaluateGuard(guard, ['editor', 'reviewer'])).toBe(true);
    expect(evaluateGuard(guard, ['editor'])).toBe(false);
    expect(evaluateGuard(guard, ['reviewer'])).toBe(false);
  });
});
