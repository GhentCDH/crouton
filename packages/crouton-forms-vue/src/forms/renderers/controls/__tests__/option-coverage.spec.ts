import { ZodUnion, type z } from 'zod';

import { fieldInputRegistry } from '@ghentcdh/crouton-core';

import { autocompleteVariants } from './autocomplete.variants';
import { booleanVariants } from './boolean.variants';
import { type ControlVariant, usedOptionKeys } from './control-variant';
import { multiSelectVariants } from './multiselect.variants';
import { numberVariants } from './number.variants';
import { selectVariants } from './select.variants';
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
  select: { variants: selectVariants, skipped: { customRender: CUSTOM_RENDER } },
  multiSelect: { variants: multiSelectVariants, skipped: { customRender: CUSTOM_RENDER } },
  autocomplete: {
    variants: autocompleteVariants,
    skipped: {
      customRender: CUSTOM_RENDER,
      skipAuth: 'not read by the renderer or useFetchOptions — the injected http client decides auth',
    },
  },
  toggle: {
    variants: toggleVariants,
    skipped: { customRender: CUSTOM_RENDER, placeholder: 'a button group has no placeholder' },
  },
};

const declaredKeys = (type: string): string[] => {
  const def = fieldInputRegistry.get(type);
  if (!def) throw new Error(`Unknown control type "${type}"`);
  // A union (e.g. autocomplete: inline | remote | resource) declares the keys of all members.
  const members = def.options instanceof ZodUnion ? (def.options.options as z.ZodObject[]) : [def.options as z.ZodObject];
  return [...new Set(members.flatMap((m) => Object.keys(m.shape)))];
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
