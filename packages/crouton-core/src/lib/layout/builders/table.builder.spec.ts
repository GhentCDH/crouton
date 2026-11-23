import { describe, expect, it, vi } from 'vitest';

import type { JsonColumn } from '../../resource/Column';
import type { LayoutBuildContext } from './layout-builder.types';
import { buildTableLayout } from './table.builder';

const ctx: LayoutBuildContext = {
  columns: [{ id: 'title', type: 'string' }] as JsonColumn[],
  source: () => ({ type: 'object', properties: { title: { type: 'string' } } }),
  warn: vi.fn(),
};

const tableOptions = (node: Record<string, unknown>) =>
  (buildTableLayout(node as never, ctx)['table']?.ui as { options?: Record<string, unknown> })
    ?.options;

describe('buildTableLayout — download option', () => {
  it('forwards layout.table.download into ui.options', () => {
    const options = tableOptions({ items: ['title'], download: { csv: true, fileName: 'books' } });
    expect(options?.['download']).toEqual({ csv: true, fileName: 'books' });
  });

  it('omits download when not configured (inherit global rule)', () => {
    const options = tableOptions({ items: ['title'] });
    expect(options).not.toHaveProperty('download');
  });
});
