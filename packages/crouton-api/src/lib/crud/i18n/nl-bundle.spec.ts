/**
 * Validates the book-collection nl.json translation bundle:
 *  - Schema is valid
 *  - All expected resource keys are present and non-empty
 *  - Enum values are present
 *  - Validation error codes are present
 *  - Fallback to EN works for missing keys
 */
import {
  type TranslationBundle,
  TranslationBundleSchema,
  createTranslator,
} from '@crouton/i18n';
import { describe, expect, it } from 'vitest';


import { invalid } from '../test-utils';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';


const _dirname = dirname(fileURLToPath(import.meta.url));
const bundlePath = resolve(
  _dirname,
  '../../../../../../examples/book-collection/translations/nl.json',
);
const nl = invalid<TranslationBundle>(JSON.parse(readFileSync(bundlePath, 'utf-8')));

const en = {
  resources: {
    book: { title: 'Books', columns: { title: 'Title', isbn: 'ISBN', publishedYear: 'Published Year', status: 'Status' } },
    author: { title: 'Authors', columns: { name: 'Name', bio: 'Bio' } },
    category: { title: 'Categories', columns: { name: 'Name', slug: 'Slug' } },
    loan: { title: 'Loans', columns: { loanedAt: 'Loaned At', returnedAt: 'Returned At' } },
    user: { title: 'Users', columns: { name: 'Name', email: 'Email' } },
  },
  enums: {
    bookStatus: { draft: 'Draft', published: 'Published', archived: 'Archived' },
  },
};

describe('nl.json TranslationBundle', () => {
  it('parses against TranslationBundleSchema without errors', () => {
    const result = TranslationBundleSchema.safeParse(nl);
    expect(result.success).toBe(true);
  });

  describe('resource titles', () => {
    const t = createTranslator({ nl, en }, 'nl', 'en');

    it('book title is "Boeken"', () => {
      expect(t('resources.book.title')).toBe('Boeken');
    });

    it('author title is "Auteurs"', () => {
      expect(t('resources.author.title')).toBe('Auteurs');
    });

    it('category title is "Categorieën"', () => {
      expect(t('resources.category.title')).toBe('Categorieën');
    });

    it('loan title is "Uitleningen"', () => {
      expect(t('resources.loan.title')).toBe('Uitleningen');
    });

    it('user title is "Gebruikers"', () => {
      expect(t('resources.user.title')).toBe('Gebruikers');
    });
  });

  describe('sidebar labels', () => {
    const t = createTranslator({ nl, en }, 'nl', 'en');

    it('book sidebar is "Boeken"', () => {
      expect(t('resources.book.sidebar')).toBe('Boeken');
    });

    it('loan sidebar is "Uitleningen"', () => {
      expect(t('resources.loan.sidebar')).toBe('Uitleningen');
    });
  });

  describe('column labels', () => {
    const t = createTranslator({ nl, en }, 'nl', 'en');

    it('book.title column is "Titel"', () => {
      expect(t('resources.book.columns.title')).toBe('Titel');
    });

    it('user.email column is "E-mail"', () => {
      expect(t('resources.user.columns.email')).toBe('E-mail');
    });

    it('loan.loanedAt column translated', () => {
      expect(t('resources.loan.columns.loanedAt')).toBe('Uitgeleend op');
    });

    it('book.isbn column falls back to EN (not in nl.json by design)', () => {
      // isbn has no NL translation — must fall back to EN
      expect(t('resources.book.columns.isbn')).toBe('ISBN');
    });
  });

  describe('enum values', () => {
    const t = createTranslator({ nl, en }, 'nl', 'en');

    it('bookStatus.draft is "Concept"', () => {
      expect(t('enums.bookStatus.draft')).toBe('Concept');
    });

    it('bookStatus.published is "Gepubliceerd"', () => {
      expect(t('enums.bookStatus.published')).toBe('Gepubliceerd');
    });

    it('bookStatus.archived is "Gearchiveerd"', () => {
      expect(t('enums.bookStatus.archived')).toBe('Gearchiveerd');
    });
  });

  describe('validation error codes', () => {
    const t = createTranslator({ nl, en }, 'nl', 'en');

    it('validation.unique contains "{field}"', () => {
      const msg = t('validation.unique');
      expect(msg).toContain('{field}');
    });

    it('validation.invalid_type contains "{field}"', () => {
      const msg = t('validation.invalid_type');
      expect(msg).toContain('{field}');
    });
  });

  describe('action labels', () => {
    const t = createTranslator({ nl, en }, 'nl', 'en');

    it('book.actions.searchOpenLibrary is translated', () => {
      const label = t('resources.book.actions.searchOpenLibrary');
      expect(label).not.toBe('resources.book.actions.searchOpenLibrary');
      expect(label.length).toBeGreaterThan(0);
    });
  });

  describe('fallback behaviour', () => {
    it('EN translator returns English values', () => {
      const t = createTranslator({ nl, en }, 'en', 'en');
      expect(t('resources.book.title')).toBe('Books');
    });

    it('missing key returns EN fallback', () => {
      const t = createTranslator({ nl, en }, 'nl', 'en');
      // isbn has no NL translation → falls back to EN
      expect(t('resources.book.columns.isbn')).toBe('ISBN');
    });
  });
});
