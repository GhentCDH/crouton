export type ExampleKey =
  | 'grid-colspan'
  | 'collapse'
  | 'group'
  | 'table-order'
  | 'missing-extra'
  | 'rowspan'
  | 'overrides'
  | 'nested';

type Preset = { columns: unknown[]; layout: Record<string, unknown>; label: string; description: string };

const BASE_COLUMNS = [
  { id: 'id', type: 'string', idField: true, hiddenInForm: true, hiddenInTable: true },
  { id: 'label', type: 'string', label: 'Label' },
  { id: 'description', type: 'string', label: 'Description' },
  { id: 'title', type: 'string', label: 'Title' },
  { id: 'body', type: 'string', label: 'Body', fieldInput: { type: 'markdown' } },
  { id: 'status', type: 'string', label: 'Status', fieldInput: { type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }] } },
  { id: 'authorName', type: 'string', label: 'Author name' },
  { id: 'authorEmail', type: 'string', label: 'Author email' },
  { id: 'createdAt', type: 'string', label: 'Created', fieldInput: { type: 'date' } },
  { id: 'updatedAt', type: 'string', label: 'Updated', fieldInput: { type: 'date' } },
];

export const EXAMPLES: Record<ExampleKey, Preset> = {
  'grid-colspan': {
    label: 'Grid with colspan',
    description: '3/9 split on id+label, full-width description row',
    columns: BASE_COLUMNS,
    layout: {
      form: {
        type: 'grid',
        columns: 12,
        controls: [
          { id: 'id', colspan: 3 },
          { id: 'label', colspan: 9 },
          'description',
          'authorName',
          'authorEmail',
        ],
      },
    },
  },
  collapse: {
    label: 'Collapse section',
    description: 'Collapsible Metadata section at bottom',
    columns: BASE_COLUMNS,
    layout: {
      form: {
        controls: ['title', 'body'],
        items: [
          {
            type: 'collapse',
            title: 'Metadata',
            controls: ['authorName', 'authorEmail', 'createdAt', 'updatedAt'],
          },
        ],
      },
    },
  },
  group: {
    label: 'Group section',
    description: 'Non-collapsible titled block',
    columns: BASE_COLUMNS,
    layout: {
      form: {
        controls: ['title', 'body'],
        items: [
          {
            type: 'group',
            title: 'Author',
            controls: ['authorName', 'authorEmail'],
          },
        ],
      },
    },
  },
  'table-order': {
    label: 'Table column order',
    description: 'Reordered headers with appended unlisted columns',
    columns: BASE_COLUMNS,
    layout: {
      table: { controls: ['title', 'status', 'createdAt'] },
    },
  },
  'missing-extra': {
    label: 'Missing / extra columns',
    description: 'Warnings shown for unknown and unreferenced columns',
    columns: BASE_COLUMNS,
    layout: {
      form: {
        controls: ['title', 'body', 'nonExistentColumn'],
      },
    },
  },
  rowspan: {
    label: 'Rowspan',
    description: 'Body spanning 2 rows next to 2 stacked inputs',
    columns: BASE_COLUMNS,
    layout: {
      form: {
        type: 'grid',
        columns: 12,
        controls: [
          { id: 'body', colspan: 6, rowspan: 2 },
          { id: 'title', colspan: 6 },
          { id: 'status', colspan: 6 },
        ],
      },
    },
  },
  overrides: {
    label: 'Control overrides',
    description: 'label, hideLabel, type, options overrides',
    columns: BASE_COLUMNS,
    layout: {
      form: {
        controls: [
          { id: 'title', label: 'Custom Title Label', colspan: 6 },
          { id: 'body', options: { minHeight: '6rem' } },
          { id: 'status', hideLabel: true },
        ],
      },
    },
  },
  nested: {
    label: 'Nested sections',
    description: 'Grid → collapse → grid with colspan',
    columns: BASE_COLUMNS,
    layout: {
      form: {
        type: 'grid',
        columns: 12,
        controls: [
          { id: 'title', colspan: 6 },
          { id: 'status', colspan: 6 },
        ],
        items: [
          {
            type: 'collapse',
            title: 'Author details',
            items: [
              {
                type: 'grid',
                columns: 12,
                controls: [
                  { id: 'authorName', colspan: 6 },
                  { id: 'authorEmail', colspan: 6 },
                ],
              },
            ],
          },
        ],
      },
    },
  },
};
