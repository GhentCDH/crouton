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
 * Cache of options already resolved by value, keyed by `<resource>|<value>`.
 *
 * An autocomplete that stores only a scalar (`storeValue: true`) has to look the
 * record up again every time an edit form is opened. Records are stable enough
 * within a session that caching them avoids a request per field per form open.
 */
const resolvedOptionCache = new Map<string, any>();
const inflightOptionRequests = new Map<string, Promise<any>>();

/** Drop every cached option lookup. Call after mutating the underlying resource. */
export const clearResolvedOptionCache = () => {
  resolvedOptionCache.clear();
  inflightOptionRequests.clear();
};

const optionCacheKey = (resource: string, value: unknown) =>
  `${resource}|${String(value)}`;

const cachedResolve = (
  key: string,
  loader: () => Promise<any>,
): Promise<any> => {
  if (resolvedOptionCache.has(key))
    return Promise.resolve(resolvedOptionCache.get(key));

  const inflight = inflightOptionRequests.get(key);
  if (inflight) return inflight;

  const request = loader()
    .then((result) => {
      const resolved = result ?? null;
      resolvedOptionCache.set(key, resolved);
      return resolved;
    })
    .catch((error) => {
      // Never break the form because a label could not be resolved.
      console.warn(`[useFetchOptions] could not resolve option ${key}`, error);
      return null;
    })
    .finally(() => {
      inflightOptionRequests.delete(key);
    });

  inflightOptionRequests.set(key, request);
  return request;
};

/** Unwrap a `{ data: ... }` envelope when the record itself is nested. */
const unwrapRecord = (body: any, labelKey?: string) => {
  if (!body || typeof body !== 'object') return body;
  if (labelKey && labelKey in body) return body;
  if (body.data && typeof body.data === 'object') return body.data;
  return body;
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
 *
 * Also returns `fetchByValue` / `peekByValue`, which resolve a stored scalar
 * (e.g. the id kept by `storeValue: true`) back to the full record so the
 * control can render a label instead of a raw id when editing.
 */
const useResourceOptions = async (
  options: AutocompleteResourceOptions,
  http: HttpClient,
  formValues: any,
) => {
  const resource = await getResourceSchema(options.resource, http);
  const lookup = resource.operations.lookup!;
  const { findOne, findAll } = resource.operations;
  const valueKey = (options.valueKey as string) ?? 'id';
  const labelKey = options.labelKey as string | undefined;

  const fetchRecordByValue = async (value: unknown) => {
    // Preferred: findOne with an `{id}`-style placeholder in its uri.
    if (findOne?.uri && /\{[^}]+\}/.test(findOne.uri)) {
      const uri = findOne.uri.replace(/\{[^}]+\}/g, () =>
        encodeURIComponent(String(value)),
      );
      const response = await (http as any)[findOne.method](uri);
      return unwrapRecord(response?.data, labelKey);
    }

    // Fallback: findAll filtered on the value key (`field:value:operator`).
    const base = findAll?.uri ?? resource.uri;
    const filter = encodeURIComponent(`${valueKey}:${String(value)}:eq`);
    const uri = `${base}${base.includes('?') ? '&' : '?'}filter=${filter}`;
    const response = await http.get(uri);
    const body = response?.data;
    const rows = Array.isArray(body)
      ? body
      : body?.[options.dataField ?? 'data'];
    return (Array.isArray(rows) ? rows[0] : rows) ?? null;
  };

  return {
    fetchOptions: (searchTerm: string, signal: AbortSignal) => {
      const uri = resolvePlaceholders(lookup.uri, formValues, searchTerm);
      const method = lookup.method;

      return (http as any)
        [method](uri, { signal })
        .then((data: any) => data.data[options.dataField ?? 'data']);
    },
    fetchByValue: (value: unknown) => {
      if (value === null || value === undefined || value === '')
        return Promise.resolve(null);
      return cachedResolve(optionCacheKey(options.resource, value), () =>
        fetchRecordByValue(value),
      );
    },
    peekByValue: (value: unknown) =>
      resolvedOptionCache.get(optionCacheKey(options.resource, value)),
    rememberValue: (value: unknown, record: unknown) => {
      if (value === null || value === undefined || value === '') return;
      resolvedOptionCache.set(optionCacheKey(options.resource, value), record);
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
 * config object with `fetchOptions`, label/value keys, optional
 * inline-create form details, and — for resource-backed options — the
 * `fetchByValue` / `peekByValue` / `rememberValue` label-resolution helpers.
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
    fetchByValue: null as ((value: unknown) => Promise<any>) | null,
    peekByValue: null as ((value: unknown) => any) | null,
    rememberValue: null as ((value: unknown, record: unknown) => void) | null,
    labelKey: options.labelKey,
    valueKey: options.valueKey,
    enableCreate: options.enableCreate ?? false,
    form: null as Record<string, any> | null,
    ...config,
  };
};
