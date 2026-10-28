import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LayoutBuildContext, ViewConfig } from './layout-builder.types';
import {
  buildCustomLayouts,
  registerLayoutBuilder,
  unregisterLayoutBuilder,
} from './registry';
import type { JsonColumn } from '../../resource/Column';
import { invalid } from '../../utils/test-utils';

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
    const cardView = { data: {}, ui: {}, columns: [] };
    registerLayoutBuilder('card', (_node, _ctx) => ({ card: cardView }));

    const result = buildCustomLayouts(undefined, ctx);
    expect(result['card']).toBe(cardView);
  });

  it('builder receives layout node for its kind', () => {
    const cardNode = { items: ['title'] };
    const layout = { card: cardNode } as Record<string, unknown>;
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
    registerLayoutBuilder('card', () => invalid<Record<string, ViewConfig>>({ card: { a: 1 } }));
    registerLayoutBuilder('card', () => invalid<Record<string, ViewConfig>>({ card: { b: 2 } }));

    const result = buildCustomLayouts(undefined, ctx);
    expect((result['card'] as Record<string, unknown>)['b']).toBe(2);
  });
});
