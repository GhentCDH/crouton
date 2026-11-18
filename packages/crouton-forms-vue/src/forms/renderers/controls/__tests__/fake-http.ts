import type { HttpClient } from '../../../../http-client';

export const COUNTRIES = [
  { name: 'Belgium', code: 'BE' },
  { name: 'France', code: 'FR' },
  { name: 'Netherlands', code: 'NL' },
];

const RESOURCE_URI = '/api/resource/country';

const byName = (term: string) =>
  COUNTRIES.filter((c) => c.name.toLowerCase().includes(term.toLowerCase()));

/** `?q=` search term, or the term appended to a uri without a `{q}` placeholder. */
const searchTerm = (url: string, base: string) => {
  const q = /[?&]q=([^&]*)/.exec(url)?.[1];
  return decodeURIComponent(q ?? url.split('?')[0].slice(base.length));
};

/**
 * Fake HTTP client for remote option variants:
 * - `/api/countries?q=` — flat array, filtered by name
 * - `/api/wrapped?q=`   — `{ items }` envelope (dataField)
 * - `/schemas/country`  — resource definition whose lookup is `/api/resource/country`
 * - `/api/resource/country<term>` / `?filter=code:XX:eq` — resource lookup / by-value
 * - `/api/fail`         — rejects
 */
export const fakeHttp = (): HttpClient => {
  const respond = (url: string): unknown => {
    if (url.startsWith('/api/countries')) return byName(searchTerm(url, '/api/countries'));
    if (url.startsWith('/api/wrapped')) return { items: byName(searchTerm(url, '/api/wrapped')) };
    if (url.startsWith('/schemas/country')) {
      return {
        id: 'country',
        uri: RESOURCE_URI,
        operations: { findAll: true, findOne: false, create: false, update: false, patch: false, delete: false },
      };
    }
    if (url.startsWith(RESOURCE_URI)) {
      const eq = /filter=([^&]*)/.exec(url)?.[1];
      const [key, value, op] = decodeURIComponent(eq ?? '').split(':');
      if (op === 'eq') return { data: COUNTRIES.filter((c) => String(c[key as keyof typeof c]) === value) };
      return { data: byName(searchTerm(url, RESOURCE_URI)) };
    }
    if (url.startsWith('/api/fail')) throw new Error('fakeHttp: 500');
    throw new Error(`fakeHttp: unexpected GET ${url}`);
  };
  const get = <T>(url: string) => {
    try {
      return Promise.resolve({ data: respond(url) as T });
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const unsupported = () => Promise.reject(new Error('fakeHttp: only GET is supported'));
  return { get, post: unsupported, patch: unsupported, delete: unsupported };
};
