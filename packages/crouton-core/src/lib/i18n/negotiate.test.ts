import { describe, expect, it } from 'vitest';

import { resolveLanguage } from './negotiate';

const supported = ['en', 'nl', 'fr'] as const;

describe('resolveLanguage', () => {
  it('picks exact match with highest q-value', () => {
    expect(
      resolveLanguage('nl-BE,nl;q=0.9,en;q=0.7', supported, 'en'),
    ).toBe('nl');
  });

  it('returns exact match when present', () => {
    expect(resolveLanguage('fr', supported, 'en')).toBe('fr');
  });

  it('falls back to base tag (nl-BE → nl)', () => {
    expect(resolveLanguage('nl-BE', supported, 'en')).toBe('nl');
  });

  it('returns default for wildcard *', () => {
    expect(resolveLanguage('*', supported, 'en')).toBe('en');
  });

  it('returns default for unknown language', () => {
    expect(resolveLanguage('de', supported, 'en')).toBe('en');
  });

  it('returns default for empty header', () => {
    expect(resolveLanguage('', supported, 'en')).toBe('en');
  });

  it('returns default for undefined header', () => {
    expect(resolveLanguage(undefined, supported, 'en')).toBe('en');
  });

  it('returns default for null header', () => {
    expect(resolveLanguage(null, supported, 'en')).toBe('en');
  });

  it('respects q=0 (explicitly excluded)', () => {
    expect(resolveLanguage('nl;q=0,fr;q=0.5', supported, 'en')).toBe('fr');
  });

  it('handles complex q-value negotiation', () => {
    expect(
      resolveLanguage('de;q=0.9,fr;q=0.8,nl;q=0.7', supported, 'en'),
    ).toBe('fr');
  });

  it('is case-insensitive', () => {
    expect(resolveLanguage('NL', supported, 'en')).toBe('nl');
  });

  it('handles whitespace in header', () => {
    expect(resolveLanguage(' fr , nl ; q=0.5 ', supported, 'en')).toBe(
      'fr',
    );
  });
});
