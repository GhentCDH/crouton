import type { PropType } from 'vue';

import type { CsvColumn, CsvRow } from './csv';

export type CsvRowsSource = CsvRow[] | (() => Promise<CsvRow[] | null> | CsvRow[] | null);

export const DownloadCsvButtonProperties = {
  columns: { type: Array as PropType<CsvColumn[]>, required: true as const },
  /** Rows, or a (async) function returning them — called on click. `null` aborts the download. */
  rows: { type: [Array, Function] as PropType<CsvRowsSource>, required: true as const },
  /** File name; `.csv` is appended when missing. */
  fileName: { type: String, required: true as const },
};
