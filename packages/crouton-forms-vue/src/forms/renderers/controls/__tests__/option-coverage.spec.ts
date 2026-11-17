import type { z } from 'zod';

import { fieldInputRegistry } from '@ghentcdh/crouton-core';

import { booleanVariants } from './boolean.variants';
import { type ControlVariant, usedOptionKeys } from './control-variant';
import { numberVariants } from './number.variants';
import { stringVariants } from './string.variants';
import { textareaVariants } from './textarea.variants';
import { toggleVariants } from './toggle.variants';

/**
 * Option coverage: every option a control's schema declares must be used by at
 * least one variant in its browser spec, unless listed in `skipped` with a reason.
 */
const CUSTOM_RENDER = 'resolved by crouton-vue custom components, not by this renderer';

const controls: Record<string, { variants: ControlVariant[]; skipped: Record<string, string> }> = {
  string: {
    variants: stringVariants,
    skipped: {
      customRender: CUSTOM_RENDER,
    },
  },
  number: { variants: numberVariants, skipped: { customRender: CUSTOM_RENDER } },
  integer: { variants: numberVariants, skipped: { customRender: CUSTOM_RENDER } },
  textarea: { variants: textareaVariants, skipped: { customRender: CUSTOM_RENDER } },
  boolean: {
    variants: booleanVariants,
    skipped: { customRender: CUSTOM_RENDER, placeholder: 'a checkbox has no placeholder' },
  },
  toggle: {
    variants: toggleVariants,
    skipped: { customRender: CUSTOM_RENDER, placeholder: 'a button group has no placeholder' },
  },
};

const declaredKeys = (type: string): string[] => {
  const def = fieldInputRegistry.get(type);
  if (!def) throw new Error(`Unknown control type "${type}"`);
  return Object.keys((def.options as z.ZodObject).shape);
};

describe('control option coverage', () => {
  test.for(Object.keys(controls))('%s: every declared option has a variant', async (type, { annotate }) => {
    const { variants, skipped } = controls[type];
    const declared = declaredKeys(type);
    const used = usedOptionKeys(variants);
    const tested = declared.filter((k) => used.has(k));
    const untested = declared.filter((k) => !used.has(k) && !(k in skipped));

    const pct = Math.round((tested.length / declared.length) * 100);
    await annotate(
      `${type}: ${tested.length}/${declared.length} options (${pct}%)` +
        (Object.keys(skipped).length ? ` — skipped: ${Object.keys(skipped).join(', ')}` : '') +
        (untested.length ? ` — untested: ${untested.join(', ')}` : ''),
    );

    expect(untested).toEqual([]);
  });
});
