/** Shared sample data for the docs demos (LayoutDemo, ComponentGallery, …). */

export const SAMPLE_VALUES: Record<string, string[]> = {
  title:       ['Introduction', 'Chapter One', 'Appendix'],
  label:       ['Alpha', 'Beta', 'Gamma'],
  description: ['Short intro text', 'A longer description here', 'See notes'],
  status:      ['draft', 'published', 'draft'],
  authorName:  ['Alice', 'Bob', 'Carol'],
  authorEmail: ['alice@example.com', 'bob@example.com', 'carol@example.com'],
  body:        ['Body text…', 'More content…', 'Final paragraph…'],
  createdAt:   ['2024-01-01', '2024-03-15', '2024-06-30'],
  updatedAt:   ['2024-02-01', '2024-04-01', '2024-07-01'],
};

/** Builds `count` rows for the given column ids, using SAMPLE_VALUES where available. */
export const sampleRows = (columnIds: string[], count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    ...Object.fromEntries(
      columnIds.map((id) => [
        id,
        SAMPLE_VALUES[id]?.[i % SAMPLE_VALUES[id].length] ?? `${id} ${i + 1}`,
      ]),
    ),
  }));

export const SAMPLE_OPTIONS = [
  'Amsterdam', 'Antwerp', 'Berlin', 'Brussels', 'Copenhagen', 'Ghent',
  'Lisbon', 'London', 'Madrid', 'Paris', 'Rome', 'Vienna',
].map((label) => ({ value: label.toLowerCase(), label }));

type SampleTable = {
  columns: { id: string; label: string }[];
  rows: Record<string, unknown>[];
};

const SMALL_COLUMNS = [
  { id: 'title', label: 'Title' },
  { id: 'authorName', label: 'Author' },
  { id: 'status', label: 'Status' },
  { id: 'createdAt', label: 'Created' },
];

export const SMALL_TABLE: SampleTable = {
  columns: SMALL_COLUMNS,
  rows: sampleRows(SMALL_COLUMNS.map((c) => c.id)),
};

const LARGE_COLUMNS = [
  { id: 'title', label: 'Title' },
  { id: 'label', label: 'Label' },
  { id: 'description', label: 'Description' },
  { id: 'status', label: 'Status' },
  { id: 'authorName', label: 'Author name' },
  { id: 'authorEmail', label: 'Author email' },
  { id: 'website', label: 'Website' },
  { id: 'city', label: 'City' },
  { id: 'createdAt', label: 'Created' },
  { id: 'updatedAt', label: 'Updated' },
];

export const LARGE_TABLE: SampleTable = {
  columns: LARGE_COLUMNS,
  rows: Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    title: `Record ${i + 1}: ${SAMPLE_VALUES.title[i % 3]}`,
    label: SAMPLE_VALUES.label[i % 3],
    description: `${SAMPLE_VALUES.description[i % 3]} — a deliberately long value to force overflow in row ${i + 1}`,
    status: SAMPLE_VALUES.status[i % 3],
    authorName: SAMPLE_VALUES.authorName[i % 3],
    authorEmail: SAMPLE_VALUES.authorEmail[i % 3],
    website: `https://example.com/records/${i + 1}`,
    city: SAMPLE_OPTIONS[i % SAMPLE_OPTIONS.length].label,
    createdAt: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`,
    updatedAt: `2025-${String((i % 12) + 1).padStart(2, '0')}-15`,
  })),
};
