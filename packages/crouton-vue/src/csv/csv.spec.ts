import { describe, expect, it } from 'vitest';

import { csvValue, toCsv } from './csv';

describe('csvValue', () => {
  it.each([
    [null, ''],
    [undefined, ''],
    [true, 'Ja'],
    [false, 'Nee'],
    [42, '42'],
    ['plain', 'plain'],
    ['2026-06-05', '05/06/2026'],
    ['2026-06-05T07:27:00.000Z', '05/06/2026 07:27'],
    [new Date(Date.UTC(2026, 0, 2, 3, 4)), '02/01/2026 03:04'],
    [{ value: 'A', label: 'Alpha' }, 'Alpha'],
    [{ id: 7, name: 'Book' }, 'Book'],
    [{ foo: 1 }, '{"foo":1}'],
    [[{ label: 'a' }, { label: 'b' }], 'a, b'],
  ])('%j → %s', (input, expected) => {
    expect(csvValue(input, { yes: 'Ja', no: 'Nee' })).toBe(expected);
  });
});

describe('toCsv', () => {
  it('starts with BOM, uses ; and CRLF, quotes every cell and escapes "', () => {
    const csv = toCsv(
      [
        { key: 'title', label: 'Title' },
        { key: 'author.name', label: 'Author' },
        { key: 'n', label: 'N', value: (r) => `#${r['n']}` },
      ],
      [{ title: 'Say "hi"; ok', author: { name: 'Zoë' }, n: 1 }],
    );
    expect(csv).toBe('\uFEFF"Title";"Author";"N"\r\n"Say ""hi""; ok";"Zoë";"#1"\r\n');
  });
});
