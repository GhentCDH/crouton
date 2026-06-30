import type {
  AutocompleteAllOptions,
  AutocompleteRemoteOptions,
  AutocompleteResourceOptions
} from '@ghentcdh/crouton-core';

import type { HttpClient } from '../../../../http-client';
import { getResourceSchema } from '../resource';

/**
 * Resolve `{form.fieldName}` placeholders in a URI against the current form values,
 * and replace `{q}` (or `{text}`) with the search term.
 * Falls back to appending the search term if no `{q}` / `{text}` placeholder exists.
 */
const resolvePlaceholders = (
  uri: string,
  formValues: any,
  searchTerm: string,
): string => {
  const resolved = uri.replace(/\{form\.([^}]+)\}/g, (_, key) => {
    // Support dotted paths e.g. {form.metadata_config.key} → formValues.metadata_config.key
    const value = key
      .split('.')
      .reduce((o: any, k: string) => o?.[k], formValues);
    return encodeURIComponent(value ?? '');
  });
  if (resolved.includes('{q}'))
    return resolved.replace('{q}', encodeURIComponent(searchTerm));
  if (resolved.includes('{text}'))
    return resolved.replace('{text}', searchTerm);
  return `${resolved}${encodeURIComponent(searchTerm)}`;
};

/**
 * Creates a fetch function for remote URI-based autocomplete.
 * Supports `{form.fieldName}` placeholders in the URI resolved from sibling form values.
 * Use `{q}` in the URI for the search term; falls back to appending it.
 */
const useRemoteOption = (
  options: AutocompleteRemoteOptions,
  http: HttpClient,
  formValues: any,
) => {
  return {
    fetchOptions: (searchTerm: string, signal: AbortSignal) => {
      const uri = resolvePlaceholders(options.uri, formValues, searchTerm);
      return http.get(uri, { signal }).then((data: any) => {
        const body = data.data;
        // Flat array response → use directly.
        if (Array.isArray(body)) return body;
        // Nested response → read the declared or default `data` field.
        return body[options.dataField ?? 'data'];
      });
    },
  };
};

/**
 * Creates a fetch function for resource-based autocomplete.
 *
 * Loads the resource definition via {@link getResourceSchema}, then uses
 * its `lookup` operation to search. If the resource supports `create`,
 * returns a form config (JSON Schema + UI schema) and a `create` callback
 * to allow inline creation of new entries from the autocomplete dropdown.
 */
const useResourceOptions = async (
  options: AutocompleteResourceOptions,
  http: HttpClient,
  formValues: any,
) => {
  const resource = await getResourceSchema(options.resource, http);
  const lookup = resource.operations.lookup!;
  return {
    fetchOptions: (searchTerm: string, signal: AbortSignal) => {
      const uri = resolvePlaceholders(lookup.uri, formValues, searchTerm);
      const method = lookup.method;

      return (http as any)
        [method](uri, { signal })
        .then((data: any) => data.data[options.dataField ?? 'data']);
    },
    enableCreate: !!(resource.operations.create && resource.schema.ui),
    form: resource.operations.create
      ? {
          ui_schema: resource.schema!.ui,
          json_schema: resource.schema!.data,
          title: `Create new ${resource.id}`,
          create: async (data: any) => {
            const create = resource.operations.create!;
            return (http as any)
              [create.method](create.uri, data)
              .then((result: any) => result.data);
          },
        }
      : null,
  };
};

/**
 * Resolves autocomplete configuration from control options.
 *
 * Dispatches to either {@link useRemoteOption} (when `uri` is set) or
 * {@link useResourceOptions} (when `resource` is set). Returns a unified
 * config object with `fetchOptions`, label/value keys, and optional
 * inline-create form details.
 */
export const useFetchOptions = async (
  options: AutocompleteAllOptions,
  http: HttpClient,
  formValues: any = {},
) => {
  let config: Record<string, any> = {};
  if ('uri' in options && options.uri)
    config = useRemoteOption(
      options as AutocompleteRemoteOptions,
      http,
      formValues,
    );
  if ('resource' in options && options.resource)
    config = await useResourceOptions(
      options as AutocompleteResourceOptions,
      http,
      formValues,
    );

  return {
    fetchOptions: null as
      ((searchTerm: string, signal: AbortSignal) => Promise<any>) | null,
    labelKey: options.labelKey,
    valueKey: options.valueKey,
    enableCreate: options.enableCreate ?? false,
    form: null as Record<string, any> | null,
    ...config,
  };
};
