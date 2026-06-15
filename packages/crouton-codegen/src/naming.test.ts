import { describe, expect, it } from 'vitest';

import {
  clientAccessor,
  fieldInputType,
  idTypeFor,
  isTimestampField,
  resourceNames,
  scalarFieldInputType,
} from './naming';

describe('clientAccessor', () => {
  it('lower-cases the first character only', () => {
    expect(clientAccessor('Language')).toBe('language');
    expect(clientAccessor('InternalAuthor')).toBe('internalAuthor');
  });
  it('leaves snake_case models with a lower-case first char unchanged', () => {
    expect(clientAccessor('metadata_config')).toBe('metadata_config');
  });
  it('handles already-lower names', () => {
    expect(clientAccessor('text')).toBe('text');
  });
});

describe('resourceNames', () => {
  it('derives name/route/model from the accessor and tag from the model name', () => {
    expect(resourceNames('Language')).toEqual({
      name: 'language',
      route: 'language',
      model: 'language',
      tag: 'Language',
      title: 'Language',
    });
  });
  it('humanizes snake_case titles', () => {
    const n = resourceNames('metadata_config');
    expect(n.model).toBe('metadata_config');
    expect(n.title).toBe('Metadata config');
  });
});

describe('isTimestampField', () => {
  it('detects @updatedAt', () => {
    expect(
      isTimestampField({ name: 'whenever', type: 'DateTime', isUpdatedAt: true }),
    ).toBe(true);
  });
  it('detects created_at / updated_at by name (DateTime only)', () => {
    expect(isTimestampField({ name: 'created_at', type: 'DateTime', isUpdatedAt: false })).toBe(true);
    expect(isTimestampField({ name: 'updatedAt', type: 'DateTime', isUpdatedAt: false })).toBe(true);
    expect(isTimestampField({ name: 'created', type: 'DateTime', isUpdatedAt: false })).toBe(true);
  });
  it('ignores non-DateTime fields even with timestamp-y names', () => {
    expect(isTimestampField({ name: 'created_at', type: 'String', isUpdatedAt: false })).toBe(false);
  });
  it('ignores unrelated DateTime fields', () => {
    expect(isTimestampField({ name: 'birth_date', type: 'DateTime', isUpdatedAt: false })).toBe(false);
  });
});

describe('fieldInputType', () => {
  it('maps scalars', () => {
    expect(fieldInputType('String', false)).toBe('text');
    expect(fieldInputType('Boolean', false)).toBe('boolean');
    expect(fieldInputType('Int', false)).toBe('number');
    expect(fieldInputType('DateTime', false)).toBe('date');
    expect(fieldInputType('Json', false)).toBe('json');
  });
  it('maps enums to select', () => {
    expect(fieldInputType('TextType', true)).toBe('select');
  });
});

describe('scalarFieldInputType', () => {
  it('defaults description string fields to textarea', () => {
    expect(scalarFieldInputType('description', 'String')).toBe('textarea');
    expect(scalarFieldInputType('short_description', 'String')).toBe('textarea');
  });
  it('leaves other strings as text and respects type for non-strings', () => {
    expect(scalarFieldInputType('name', 'String')).toBe('text');
    expect(scalarFieldInputType('description_count', 'Int')).toBe('number');
  });
});

describe('idTypeFor', () => {
  it('numbers for Int/BigInt, string otherwise', () => {
    expect(idTypeFor('Int')).toBe('number');
    expect(idTypeFor('BigInt')).toBe('number');
    expect(idTypeFor('String')).toBe('string');
    expect(idTypeFor(undefined)).toBe('string');
  });
});
