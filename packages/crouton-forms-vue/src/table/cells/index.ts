import type { Component } from 'vue';

import type { TextCellType } from '@ghentcdh/crouton-core';
import { BooleanCell, TextCell } from '@ghentcdh/ui';

import TableCellRender from '../TableCellRender.vue';

export interface CellRendererEntry {
  tester: (element: TextCellType) => number;
  renderer: Component;
}

export const cellTypeIs =
  (type: string, rank: number): CellRendererEntry['tester'] =>
  (element) =>
    element.type === type ? rank : -1;

export const cellFormatIs =
  (format: string, rank: number): CellRendererEntry['tester'] =>
  (element) =>
    element.options?.format === format ? rank : -1;

export const findCellRenderer = (
  registry: CellRendererEntry[],
  element: TextCellType,
): Component | undefined => {
  let best: { rank: number; renderer: Component } | undefined;
  for (const entry of registry) {
    const rank = entry.tester(element);
    if (rank > -1 && (!best || rank > best.rank)) {
      best = { rank, renderer: entry.renderer };
    }
  }
  return best?.renderer ?? TableCellRender;
};

export const defaultCellRenderers: CellRendererEntry[] = [
  { tester: cellTypeIs('TextCell', 10), renderer: TextCell },
  { tester: cellTypeIs('BooleanCell', 10), renderer: BooleanCell },
  { tester: cellTypeIs('control', 10), renderer: TableCellRender },
];
