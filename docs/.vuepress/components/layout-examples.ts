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

const col = (id: string, label: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: 'string',
  label,
  ...extra,
});

const SELECT_STATUS = { type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }] };

export const EXAMPLES: Record<ExampleKey, Preset> = {
  'grid-colspan': {
    label: 'Grid with colspan',
    description: '3/9 split on label+title, full-width description row',
    columns: [
      col('label', 'Label'),
      col('title', 'Title'),
      col('description', 'Description'),
      col('authorName', 'Author name'),
      col('authorEmail', 'Author email'),
    ],
    layout: {
      form: {
        type: 'grid',
        columns: 12,
        controls: [
          { id: 'label', colspan: 3 },
          { id: 'title', colspan: 9 },
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
    columns: [
      col('title', 'Title'),
      col('body', 'Body', { fieldInput: { type: 'markdown' } }),
      col('authorName', 'Author name'),
      col('authorEmail', 'Author email'),
      col('createdAt', 'Created', { fieldInput: { type: 'date' } }),
      col('updatedAt', 'Updated', { fieldInput: { type: 'date' } }),
    ],
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
    columns: [
      col('title', 'Title'),
      col('body', 'Body', { fieldInput: { type: 'markdown' } }),
      col('authorName', 'Author name'),
      col('authorEmail', 'Author email'),
    ],
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
    description: 'Declared columns appear first; unlisted columns appended',
    columns: [
      col('title', 'Title'),
      col('status', 'Status', { fieldInput: SELECT_STATUS }),
      col('authorName', 'Author name'),
      col('createdAt', 'Created', { fieldInput: { type: 'date' } }),
    ],
    layout: {
      table: { controls: ['status', 'createdAt', 'title'] },
    },
  },
  'missing-extra': {
    label: 'Missing / extra columns',
    description: 'Warnings panel shows unknown and unreferenced columns',
    columns: [
      col('title', 'Title'),
      col('body', 'Body', { fieldInput: { type: 'markdown' } }),
      col('status', 'Status', { fieldInput: SELECT_STATUS }),
    ],
    layout: {
      form: {
        controls: ['title', 'nonExistentColumn'],
      },
    },
  },
  rowspan: {
    label: 'Rowspan',
    description: 'Body spanning 2 rows next to 2 stacked inputs',
    columns: [
      col('body', 'Body', { fieldInput: { type: 'markdown' } }),
      col('title', 'Title'),
      col('status', 'Status', { fieldInput: SELECT_STATUS }),
    ],
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
    description: 'label, hideLabel, options overrides on existing controls',
    columns: [
      col('title', 'Title'),
      col('body', 'Body', { fieldInput: { type: 'markdown' } }),
      col('status', 'Status', { fieldInput: SELECT_STATUS }),
    ],
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
    columns: [
      col('title', 'Title'),
      col('status', 'Status', { fieldInput: SELECT_STATUS }),
      col('authorName', 'Author name'),
      col('authorEmail', 'Author email'),
    ],
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
