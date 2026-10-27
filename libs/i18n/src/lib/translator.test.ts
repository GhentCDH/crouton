import { describe, expect, it } from 'vitest';

import type { TranslationBundle } from './Translations.schema';
import { createTranslator } from './translator';

const bundles: Record<string, TranslationBundle> = {
  en: {
    resources: {
      group: {
        title: 'Groups',
        columns: {
          name: 'Name',
          description: 'Description',
        },
      },
    },
    ui: {
      actions: { save: 'Save', cancel: 'Cancel' },
    },
  },
  nl: {
    resources: {
      group: {
        title: 'Groepen',
        columns: {
          name: 'Naam',
        },
      },
    },
  },
};

describe('createTranslator', () => {
  it('resolves from requested language bundle', () => {
    const t = createTranslator(bundles, 'nl', 'en');
    expect(t('resources.group.title')).toBe('Groepen');
  });

  it('resolves nested path from requested language', () => {
    const t = createTranslator(bundles, 'nl', 'en');
    expect(t('resources.group.columns.name')).toBe('Naam');
  });

  it('falls back to default language when key missing in requested', () => {
    const t = createTranslator(bundles, 'nl', 'en');
    expect(t('resources.group.columns.description')).toBe('Description');
  });

  it('falls back to fallback argument when missing in both bundles', () => {
    const t = createTranslator(bundles, 'nl', 'en');
    expect(t('resources.group.columns.unknown', 'My Label')).toBe(
      'My Label',
    );
  });

  it('returns path when no fallback and key missing everywhere', () => {
    const t = createTranslator(bundles, 'nl', 'en');
    expect(t('resources.missing.columns.x')).toBe(
      'resources.missing.columns.x',
    );
  });

  it('treats empty string as missing', () => {
    const emptyBundles: Record<string, TranslationBundle> = {
      nl: {
        resources: {
          group: {
            columns: { name: '' },
          },
        },
      },
      en: {
        resources: {
          group: {
            columns: { name: 'Name' },
          },
        },
      },
    };
    const t = createTranslator(emptyBundles, 'nl', 'en');
    expect(t('resources.group.columns.name')).toBe('Name');
  });

  it('works when requested language equals default language', () => {
    const t = createTranslator(bundles, 'en', 'en');
    expect(t('resources.group.title')).toBe('Groups');
  });

  it('handles missing bundle for requested language', () => {
    const t = createTranslator(bundles, 'de', 'en');
    expect(t('resources.group.title')).toBe('Groups');
  });

  it('handles missing bundle for both requested and default', () => {
    const t = createTranslator({}, 'de', 'en');
    expect(t('resources.group.title', 'Fallback')).toBe('Fallback');
  });

  it('resolves deeply nested ui keys', () => {
    const t = createTranslator(bundles, 'en', 'en');
    expect(t('ui.actions.save')).toBe('Save');
  });
});
