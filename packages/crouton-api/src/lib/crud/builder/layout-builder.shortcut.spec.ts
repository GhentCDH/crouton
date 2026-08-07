import { describe, expect, it } from 'vitest';

import { ControlBuilder, LayoutBuilder } from '@ghentcdh/crouton-core';

type Author = { name: string; bio: string; active: boolean };

describe('LayoutBuilder addControl / addControls shortcuts', () => {
  it('addControl(name) builds a bare control', () => {
    const layout = LayoutBuilder.grid().addControl('name').build() as any;
    expect(layout.type).toBe('GridLayout');
    expect(layout.elements).toHaveLength(1);
    expect(layout.elements[0]).toMatchObject({
      type: 'Control',
      scope: '#/properties/name',
    });
    expect(layout.elements[0].options.format).toBe('Control');
  });

  it('addControl(name, options): `type` selects the format, other keys pass through', () => {
    const layout = LayoutBuilder.grid()
      .addControl('bio', { type: 'textarea', colspan: 6 })
      .build() as any;
    const el = layout.elements[0];
    expect(el.scope).toBe('#/properties/bio');
    expect(el.options.format).toBe('textarea');
    expect(el.options.colspan).toBe(6);
  });

  it('addControls(map) adds many controls, keys are property names, order preserved', () => {
    const layout = LayoutBuilder.grid<Author>()
      .addControls({
        name: {},
        bio: { type: 'textarea', colspan: 6 },
        active: { type: 'boolean' },
      })
      .build() as any;
    expect(layout.elements.map((e: any) => e.scope)).toEqual([
      '#/properties/name',
      '#/properties/bio',
      '#/properties/active',
    ]);
    expect(layout.elements[1].options.format).toBe('textarea');
    expect(layout.elements[2].options.format).toBe('boolean');
  });

  it('still accepts a fully-configured ControlBuilder (power-user path)', () => {
    const layout = LayoutBuilder.grid<Author>()
      .addControl(
        ControlBuilder.properties<Author>('name')
          .textArea()
          .showWhen('#/properties/active', { const: true }),
      )
      .build() as any;
    const el = layout.elements[0];
    expect(el.options.format).toBe('textarea');
    expect(el.rule).toEqual({
      effect: 'SHOW',
      condition: { scope: '#/properties/active', schema: { const: true } },
    });
  });

  it('rule helpers emit @jsonforms-native rules', () => {
    const el = ControlBuilder.properties<Author>('bio')
      .disableWhen('#/properties/active', { const: false })
      .build() as any;
    expect(el.rule).toEqual({
      effect: 'DISABLE',
      condition: { scope: '#/properties/active', schema: { const: false } },
    });
  });

  it('build() returns a plain @jsonforms/core Layout (no options key when empty)', () => {
    const layout = LayoutBuilder.horizontal().build() as any;
    expect(layout).toEqual({ type: 'HorizontalLayout', elements: [] });
  });
});
