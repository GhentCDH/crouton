import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { type InjectionKey, inject } from 'vue';

export const CROUTON_EDITABLE_RENDERERS: InjectionKey<
  JsonFormsRendererRegistryEntry[]
> = Symbol('crouton-editable-renderers');

export const CROUTON_READONLY_RENDERERS: InjectionKey<
  JsonFormsRendererRegistryEntry[]
> = Symbol('crouton-readonly-renderers');

/**
 * Resolves the effective renderer list for a form component.
 *
 * - If the component received an explicit `renderers` prop, that wins.
 * - Otherwise falls back to the injected app-level defaults
 *   (editable or readonly depending on `readonly`).
 */
export const useDefaultRenderers = (
  propRenderers: JsonFormsRendererRegistryEntry[] | null | undefined,
  readonly: boolean,
): JsonFormsRendererRegistryEntry[] | undefined => {
  const injected = inject(
    readonly ? CROUTON_READONLY_RENDERERS : CROUTON_EDITABLE_RENDERERS,
    undefined,
  );
  return propRenderers ?? injected;
};
