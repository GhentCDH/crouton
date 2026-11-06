import type {
  AutocompleteAllOptions,
  AutocompleteRemoteOptions,
  AutocompleteResourceOptions
} from '@ghentcdh/crouton-core';

import type { HttpClient } from '../../../../http-client';
import { getResourceSchema } from '../resource';

type FormValues = Record<string, unknown>;
type UnknownRecord = Record<string, unknown>;

/**
 * Resolve `{form.fieldName}` placeholders in a URI against the current form values,
 * and replace `{q}` (or `{text}`) with the search term.
 * Falls back to appending the search term if no `{q}` / `{text}` placeholder exists.
 */
const resolvePlaceholders = (
  uri: string,
  formValues: FormValues,
  searchTerm: string,
): string => {
  const resolved = uri.replace(/\{form\.([^}]+)\}/g, (_, key: string) => {
    const value = (key as string)
      .split('.')
      .reduce((o: unknown, k: string) => (o && typeof o === 'object' ? (o as UnknownRecord)[k] : undefined), formValues as unknown);
    return encodeURIComponent(value != null ? String(value) : '');
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
const resolvedOptionCache = new Map<string, unknown>();
const inflightOptionRequests = new Map<string, Promise<unknown>>();

/** Drop every cached option lookup. Call after mutating the underlying resource. */
/** @internal test seam — clears the memoized option cache between specs. */
export const clearResolvedOptionCache = () => {
  resolvedOptionCache.clear();
  inflightOptionRequests.clear();
};

const optionCacheKey = (resource: string, value: unknown) =>
  `${resource}|${String(value)}`;

const cachedResolve = (
  key: string,
  loader: () => Promise<unknown>,
): Promise<unknown> => {
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
    .catch((error: unknown) => {
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
const unwrapRecord = (body: unknown, labelKey?: string): unknown => {
  if (!body || typeof body !== 'object') return body;
  const obj = body as UnknownRecord;
  if (labelKey && labelKey in obj) return obj;
  if (obj['data'] && typeof obj['data'] === 'object') return obj['data'];
  return obj;
};

type ExcludeOption = { values?: string | unknown[]; key?: string; selected?: boolean };

const resolveFormPath = (path: string, formValues: FormValues): unknown =>
  path.split('.').reduce((o: unknown, k: string) => (o && typeof o === 'object' ? (o as UnknownRecord)[k] : undefined), formValues as unknown);

const resolveExclude = (
  exclude: ExcludeOption | undefined,
  formValues: FormValues,
  runtimeExclude: unknown[] | undefined,
  valueKey: string,
  ownValue?: unknown,
): { list: unknown[]; key: string } => {
  const key = exclude?.key ?? valueKey;
  const collected: unknown[] = [];

  const toScalar = (item: unknown): unknown =>
    typeof item === 'object' && item !== null ? (item as UnknownRecord)[valueKey] : item;

  if (exclude?.values !== undefined) {
    let resolved: unknown = exclude.values;
    if (typeof exclude.values === 'string' && exclude.values.startsWith('{form.')) {
      resolved = resolveFormPath(exclude.values.slice(6, -1), formValues);
    }
    const arr = Array.isArray(resolved) ? resolved : (resolved != null ? [resolved] : []);
    for (const item of arr) {
      const v = toScalar(item);
      if (v != null) collected.push(v);
    }
  }

  if (runtimeExclude) {
    for (const item of runtimeExclude) {
      const v = toScalar(item);
      if (v != null) collected.push(v);
    }
  }

  if (exclude?.selected && ownValue != null) {
    const own = Array.isArray(ownValue) ? ownValue : [ownValue];
    for (const item of own) {
      const v = toScalar(item);
      if (v != null) collected.push(v);
    }
  }

  const seen = new Set<unknown>();
  return {
    list: collected.filter(v => { if (seen.has(v)) return false; seen.add(v); return true; }),
    key,
  };
};

/** Dispatch an HTTP method by name without casting to `any`. */
const callMethod = (
  http: HttpClient,
  method: string,
  url: string,
  data?: unknown,
  config?: unknown,
): Promise<{ data: unknown }> =>
  (http as unknown as Record<string, (u: string, d?: unknown, c?: unknown) => Promise<{ data: unknown }>>)[method](url, data, config);

/**
 * Creates a fetch function for remote URI-based autocomplete.
 * Supports `{form.fieldName}` placeholders in the URI resolved from sibling form values.
 * Use `{q}` in the URI for the search term; falls back to appending it.
 * Use `{exclude}` in the URI to receive the JSON-encoded exclude list.
 */
const useRemoteOption = (
  options: AutocompleteRemoteOptions,
  http: HttpClient,
  formValues: FormValues,
  excludeList: unknown[] = [],
) => {
  return {
    fetchOptions: (searchTerm: string, signal: AbortSignal) => {
      let uri = resolvePlaceholders(options.uri, formValues, searchTerm);
      if (excludeList.length > 0 && uri.includes('{exclude}')) {
        uri = uri.replace('{exclude}', encodeURIComponent(JSON.stringify(excludeList)));
      }
      return http.get<unknown[] | UnknownRecord>(uri, { signal }).then((resp) => {
        const body = resp.data;
        // Flat array response → use directly.
        if (Array.isArray(body)) return body;
        // Nested response → read the declared or default `data` field.
        return (body as UnknownRecord)[options.dataField ?? 'data'];
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
  formValues: FormValues,
  excludeList: unknown[] = [],
  excludeKey = 'id',
) => {
  const resource = await getResourceSchema(options.resource, http);
  const lookup = resource.operations.lookup ?? resource.operations.findAll;
  const { findOne, findAll } = resource.operations;
  const valueKey = (options.valueKey as string) ?? 'id';
  const labelKey = options.labelKey as string | undefined;

  // TODO use the crouton logic for resources
  const fetchRecordByValue = async (value: unknown): Promise<unknown> => {
    // Preferred: findOne with an `{id}`-style placeholder in its uri.
    if (findOne?.uri && /\{[^}]+\}/.test(findOne.uri)) {
      const uri = findOne.uri.replace(/\{[^}]+\}/g, () =>
        encodeURIComponent(String(value)),
      );
      const response = await callMethod(http, findOne.method, uri);
      return unwrapRecord(response?.data, labelKey);
    }

    // Fallback: findAll filtered on the value key (`field:value:operator`).
    const base = findAll?.uri ?? resource.uri;
    const filter = encodeURIComponent(`${valueKey}:${String(value)}:eq`);
    const uri = `${base}${base.includes('?') ? '&' : '?'}filter=${filter}`;
    const response = await http.get(uri);
    const body = response?.data as unknown;
    const rows = Array.isArray(body)
      ? body
      : (body as UnknownRecord | undefined)?.[options.dataField ?? 'data'];
    return (Array.isArray(rows) ? rows[0] : rows) ?? null;
  };

  return {
    fetchOptions: (searchTerm: string, signal: AbortSignal) => {
      let uri = resolvePlaceholders(lookup.uri, formValues, searchTerm);
      if (excludeList.length > 0 && excludeList.length <= 200) {
        const param = `${excludeKey}:${JSON.stringify(excludeList)}:not_in`;
        uri += `${uri.includes('?') ? '&' : '?'}filter=${encodeURIComponent(param)}`;
      }
      const method = lookup.method;

      return callMethod(http, method, uri, undefined, { signal })
        .then((resp) => (resp.data as UnknownRecord)[options.dataField ?? 'data']);
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
    enableCreate: !!(resource.operations.create && resource.schema?.ui),
    form: resource.operations.create && resource.schema
      ? {
          ui: resource.schema.ui,
          data: resource.schema.data,
          title: `Create new ${resource.id}`,
          create: async (data: unknown) => {
            const create = resource.operations.create;
            if (!create) return null;
            return callMethod(http, create.method, create.uri, data)
              .then((result) => result.data);
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
  formValues: FormValues = {},
  runtimeExclude?: unknown[],
  ownValue?: unknown,
) => {
  const valueKey = (options.valueKey as string) ?? 'id';
  const excludeOpt = ('exclude' in options ? (options as AutocompleteAllOptions & { exclude?: ExcludeOption }).exclude : undefined);
  const { list: excludeList, key: excludeKey } = resolveExclude(
    excludeOpt,
    formValues,
    runtimeExclude,
    valueKey,
    ownValue,
  );

  let config: Record<string, unknown> = {};
  if ('uri' in options && options.uri)
    config = useRemoteOption(options as AutocompleteRemoteOptions, http, formValues, excludeList);
  if ('resource' in options && options.resource)
    config = await useResourceOptions(
      options as AutocompleteResourceOptions,
      http,
      formValues,
      excludeList,
      excludeKey,
    );

  // Client-side fallback: always filter out excluded values after fetch
  const rawFetch = config['fetchOptions'] as ((searchTerm: string, signal: AbortSignal) => Promise<unknown>) | null;
  if (rawFetch && excludeList.length > 0) {
    const excludeSet = new Set(excludeList.map(String));
    config['fetchOptions'] = (searchTerm: string, signal: AbortSignal) =>
      rawFetch(searchTerm, signal).then((items: unknown) => {
        if (!Array.isArray(items)) return items;
        return items.filter(item => {
          const v = typeof item === 'object' && item !== null ? (item as UnknownRecord)[valueKey] : item;
          return !excludeSet.has(String(v));
        });
      });
  }

  return {
    fetchOptions: null as
      ((searchTerm: string, signal: AbortSignal) => Promise<unknown>) | null,
    fetchByValue: null as ((value: unknown) => Promise<unknown>) | null,
    peekByValue: null as ((value: unknown) => unknown) | null,
    rememberValue: null as ((value: unknown, record: unknown) => void) | null,
    labelKey: options.labelKey,
    valueKey: options.valueKey,
    enableCreate: options.enableCreate ?? false,
    form: null as Record<string, unknown> | null,
    ...config,
  };
};
