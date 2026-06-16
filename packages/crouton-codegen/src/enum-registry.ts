/**
 * Build / maintain the shared project enum registry (`crouton.enums.json`):
 * one `{ value, label }[]` per Prisma enum, referenced from columns by name.
 */

import { labelFromId } from './naming';
import type { DbModel } from './types';

export interface EnumOption {
  value: string;
  label: string;
}

export type EnumRegistry = Record<string, EnumOption[]>;

/**
 * Collect the enums actually used by the given models into a registry, with a
 * humanized default `label` per member (e.g. `original` → "Original").
 */
export const buildEnumRegistry = (models: DbModel[]): EnumRegistry => {
  const out: EnumRegistry = {};
  for (const model of models) {
    for (const field of model.fields) {
      if (field.kind !== 'enum' || !field.enumValues?.length) continue;
      if (out[field.type]) continue;
      out[field.type] = field.enumValues.map((v) => ({ value: v, label: labelFromId(v) }));
    }
  }
  return out;
};

/**
 * Merge freshly generated enums into an existing registry:
 *  - add enums/members not yet present (with the generated default label),
 *  - preserve existing member labels + order (hand edits win, never dropped).
 */
export const mergeEnumRegistry = (
  existing: EnumRegistry,
  generated: EnumRegistry,
): EnumRegistry => {
  const out: EnumRegistry = {};
  for (const [name, opts] of Object.entries(existing)) out[name] = [...opts];
  for (const [name, genOpts] of Object.entries(generated)) {
    const current = out[name] ? [...out[name]] : [];
    const have = new Set(current.map((o) => o.value));
    for (const opt of genOpts) {
      if (!have.has(opt.value)) current.push(opt);
    }
    out[name] = current;
  }
  return out;
};

export const serializeEnumRegistry = (registry: EnumRegistry): string =>
  `${JSON.stringify(registry, null, 2)}\n`;
