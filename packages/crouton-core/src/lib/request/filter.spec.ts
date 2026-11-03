import { describe, expect, it } from 'vitest';

import { buildFilter, parseFilterString, parseListValue } from './filter';

describe('parseListValue', () => {
  it('parses a JSON array of strings', () => {
    expect(parseListValue('["a","b"]')).toEqual(['a', 'b']);
  });

  it('parses a JSON array of numbers', () => {
    expect(parseListValue('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns [] for invalid JSON', () => {
    expect(parseListValue('not-json')).toEqual([]);
  });

  it('returns [] for a non-array JSON value', () => {
    expect(parseListValue('"just-a-string"')).toEqual([]);
    expect(parseListValue('42')).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(parseListValue('')).toEqual([]);
  });
});

describe('parseFilterString — in / not_in operators', () => {
  it('parses an in filter with JSON array value', () => {
    const result = parseFilterString('id:["1","2"]:in');
    expect(result).toEqual({ field: 'id', value: '["1","2"]', operator: 'in' });
  });

  it('parses a not_in filter', () => {
    const result = parseFilterString('id:[1,2]:not_in');
    expect(result).toEqual({ field: 'id', value: '[1,2]', operator: 'not_in' });
  });

  it('handles JSON values containing colons', () => {
    const result = parseFilterString('tag:["a:b","c:d"]:not_in');
    expect(result).toEqual({ field: 'tag', value: '["a:b","c:d"]', operator: 'not_in' });
  });
});

describe('buildFilter — in / not_in', () => {
  it('builds an in condition', () => {
    const result = buildFilter(['id:["x","y"]:in']);
    expect(result).toEqual({ id: { in: ['x', 'y'] } });
  });

  it('builds a not_in condition', () => {
    const result = buildFilter(['id:[1,2]:not_in']);
    expect(result).toEqual({ id: { notIn: [1, 2] } });
  });

  it('skips in/not_in when the list is empty', () => {
    expect(buildFilter(['id:[]:in'])).toEqual({});
    expect(buildFilter(['id:invalid-json:not_in'])).toEqual({});
  });
});
