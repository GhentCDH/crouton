import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LayoutBuildContext } from './layout-builder.types';
import {
  buildCustomLayouts,
  registerLayoutBuilder,
  unregisterLayoutBuilder,
} from './registry';
import type { JsonColumn } from '../../resource/Column';

const ctx: LayoutBuildContext = {
  columns: [] as JsonColumn[],
  source: () => undefined,
  warn: vi.fn(),
};

afterEach(() => {
  unregisterLayoutBuilder('card');
});

describe('registerLayoutBuilder', () => {
  it('custom kind appears in buildCustomLayouts output', () => {
    const cardView = { json_schema: {}, ui_schema: {}, columns: [] };
    registerLayoutBuilder('card', (_node, _ctx) => ({ card: cardView as any }));

    const result = buildCustomLayouts(undefined, ctx);
    expect(result['card']).toBe(cardView);
  });

  it('builder receives layout node for its kind', () => {
    const cardNode = { items: ['title'] };
    const layout = { card: cardNode } as any;
    let received: unknown;
    registerLayoutBuilder('card', (node, _ctx) => {
      received = node;
      return {};
    });

    buildCustomLayouts(layout, ctx);
    expect(received).toBe(cardNode);
  });

  it('returns empty when no custom builders registered', () => {
    expect(buildCustomLayouts(undefined, ctx)).toEqual({});
  });

  it('overwriting a kind replaces the builder', () => {
    registerLayoutBuilder('card', () => ({ card: { a: 1 } as any }));
    registerLayoutBuilder('card', () => ({ card: { b: 2 } as any }));

    const result = buildCustomLayouts(undefined, ctx);
    expect((result['card'] as any).b).toBe(2);
  });
});
