import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configureAllowedLanguages, configureLanguage, resolveLanguages } from './useLanguage';

// ---------------------------------------------------------------------------
// resolveLanguages — pure helper, no side effects
// ---------------------------------------------------------------------------

describe('resolveLanguages', () => {
  it('backend [en, nl], plugin [en] → supported = [en]', () => {
    const { supported, defaultLanguage } = resolveLanguages(['en', 'nl'], ['en']);
    expect(supported).toEqual(['en']);
    expect(defaultLanguage).toBe('en');
  });

  it('no plugin list → returns full backend list', () => {
    const { supported } = resolveLanguages(['en', 'nl', 'fr'], undefined);
    expect(supported).toEqual(['en', 'nl', 'fr']);
  });

  it('no backend i18n, plugin [en, fr] → returns plugin list', () => {
    const { supported, defaultLanguage } = resolveLanguages(undefined, ['en', 'fr']);
    expect(supported).toEqual(['en', 'fr']);
    expect(defaultLanguage).toBe('en');
  });

  it('no overlap → falls back to first plugin language and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { supported, defaultLanguage } = resolveLanguages(['de'], ['en', 'fr']);
    expect(supported).toEqual(['en']);
    expect(defaultLanguage).toBe('en');
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('both undefined → empty supported, en default', () => {
    const { supported, defaultLanguage } = resolveLanguages(undefined, undefined);
    expect(supported).toEqual([]);
    expect(defaultLanguage).toBe('en');
  });

  it('plugin without defaultLanguage → first plugin language used as default', () => {
    const { supported, defaultLanguage } = resolveLanguages(undefined, ['en']);
    expect(supported).toEqual(['en']);
    expect(defaultLanguage).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// configureLanguage — integration with localStorage and navigator mocks
// ---------------------------------------------------------------------------

const makeStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    store,
  };
};

describe('configureLanguage', () => {
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    storage = makeStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('navigator', { languages: [] });
  });

  it('navigator nl-BE, backend [en, nl], plugin [en] → en', () => {
    vi.stubGlobal('navigator', { languages: ['nl-BE'] });
    configureLanguage({ languages: ['en', 'nl'], allowed: ['en'] });
    expect(storage.store['crouton.language']).toBe('en');
  });

  it('persisted nl, plugin [en] → en and localStorage overwritten', () => {
    storage.setItem('crouton.language', 'nl');
    configureLanguage({ languages: ['en', 'nl'], allowed: ['en'] });
    expect(storage.store['crouton.language']).toBe('en');
  });

  it('no plugin list → navigator language is honoured', () => {
    vi.stubGlobal('navigator', { languages: ['nl-BE'] });
    configureLanguage({ languages: ['en', 'nl'] });
    expect(storage.store['crouton.language']).toBe('nl');
  });

  it('no overlap → falls back to plugin default', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    configureLanguage({ languages: ['de'], allowed: ['en', 'fr'] });
    expect(storage.store['crouton.language']).toBe('en');
    warn.mockRestore();
  });
});

describe('configureAllowedLanguages', () => {
  let storage: ReturnType<typeof makeStorage>;

  beforeEach(() => {
    storage = makeStorage();
    vi.stubGlobal('localStorage', storage);
  });

  it('languages without defaultLanguage → first language is default', () => {
    storage.setItem('crouton.language', 'nl');
    configureAllowedLanguages({ languages: ['en'] });
    expect(storage.store['crouton.language']).toBe('en');
  });

  it('no i18n option → no-op, persisted language kept', () => {
    storage.setItem('crouton.language', 'nl');
    configureAllowedLanguages(undefined);
    expect(storage.store['crouton.language']).toBe('nl');
  });

  it('empty languages array → no-op, persisted language kept', () => {
    storage.setItem('crouton.language', 'nl');
    configureAllowedLanguages({ languages: [] });
    expect(storage.store['crouton.language']).toBe('nl');
  });
});
