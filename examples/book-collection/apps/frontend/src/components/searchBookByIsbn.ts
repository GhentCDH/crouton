import type { AxiosInstance } from 'axios';

import {
  type ResourceApiInstance,
  resourceApi,
  useCrouton,
} from '@ghentcdh/crouton-vue';

export interface MappedBook {
  book: {
    title: string;
    isbn: string;
    publishedYear: number | null;
    status: string;
    summary: string | null;
    rating: number | null;
  };
  author: { name: string; bio: string | null };
  categories: { name: string; slug: string }[];
  coverUrl: string | null;
}

interface SourceResult {
  coverUrl: string | null;
  title: string | null;
  authors: string[];
  publishedYear: number | null;
  summary: string | null;
  categories: string[];
  rating: number | null;
}

interface OpenLibraryBook {
  title?: string;
  authors?: { name: string }[];
  publish_date?: string;
  subjects?: { name: string }[];
  cover?: { small?: string; medium?: string; large?: string };
}
type OpenLibraryResponse = Record<string, OpenLibraryBook>;

interface GoogleBooksResponse {
  items?: {
    volumeInfo?: {
      title?: string;
      subtitle?: string;
      authors?: string[];
      publishedDate?: string;
      description?: string;
      categories?: string[];
      averageRating?: number;
      imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    };
  }[];
}

const normalizeIsbn = (isbn: string): string =>
  isbn.replace(/[^0-9Xx]/g, '').toUpperCase();

const parseYear = (date?: string | null): number | null => {
  const m = String(date ?? '').match(/\d{4}/);
  return m ? Number(m[0]) : null;
};

const toRating = (value?: number | null): number | null =>
  value == null || Number.isNaN(value)
    ? null
    : Math.min(5, Math.max(0, Math.round(value)));

const slugify = (s: string): string =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const fetchJson = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
};

const fromOpenLibrary = async (isbn: string): Promise<SourceResult | null> => {
  const data = await fetchJson<OpenLibraryResponse>(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  );
  const b = data?.[`ISBN:${isbn}`];
  if (!b) return null;
  return {
    title: b.title ?? null,
    authors: (b.authors ?? []).map((a) => a.name),
    publishedYear: parseYear(b.publish_date),
    summary: null,
    categories: (b.subjects ?? []).map((s) => s.name),
    rating: null,
    coverUrl: b.cover?.large ?? b.cover?.medium ?? b.cover?.small ?? null,
  };
};

const fromGoogleBooks = async (isbn: string): Promise<SourceResult | null> => {
  const data = await fetchJson<GoogleBooksResponse>(
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
  );
  const v = data?.items?.[0]?.volumeInfo;
  if (!v) return null;
  return {
    title: v.title
      ? v.subtitle
        ? `${v.title}: ${v.subtitle}`
        : v.title
      : null,
    authors: v.authors ?? [],
    publishedYear: parseYear(v.publishedDate),
    summary: v.description ?? null,
    categories: v.categories ?? [],
    rating: toRating(v.averageRating),
    coverUrl:
      (v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail)?.replace(
        /^http:/,
        'https:',
      ) ?? null,
  };
};

export const searchBookByIsbn = async (isbn: string): Promise<MappedBook> => {
  const clean = normalizeIsbn(isbn);
  if (clean.length !== 10 && clean.length !== 13) {
    throw new Error(`Invalid ISBN: "${isbn}"`);
  }

  const [ol, gb] = await Promise.all([
    fromOpenLibrary(clean),
    fromGoogleBooks(clean),
  ]);
  if (!ol && !gb) throw new Error(`No book found for ISBN ${clean}`);

  const pick = <K extends 'title' | 'publishedYear' | 'summary'>(key: K) =>
    ol?.[key] ?? gb?.[key] ?? null;

  const authors = ol?.authors.length ? ol.authors : (gb?.authors ?? []);
  const categoryNames = [
    ...new Set([...(gb?.categories ?? []), ...(ol?.categories ?? [])]),
  ].slice(0, 5);

  return {
    book: {
      title: pick('title') ?? 'Untitled',
      isbn: clean,
      publishedYear: pick('publishedYear'),
      status: 'draft',
      summary: pick('summary'),
      rating: gb?.rating ?? null,
    },
    author: { name: authors[0] ?? 'Unknown', bio: null },
    categories: categoryNames.map((name) => ({ name, slug: slugify(name) })),
    coverUrl: ol?.coverUrl ?? gb?.coverUrl ?? null,
  };
};

let authorResource: ResourceApiInstance;

const useAuthorResource = async () => {
  if (authorResource) return authorResource;

  const formDef = await useCrouton().getFormDefById('author');

  authorResource = resourceApi(formDef);

  return authorResource;
};

/** Find an existing author by name (first match) or create one, returning the author id. */
export const findOrCreateAuthor = async (
  api: AxiosInstance,
  name: string,
): Promise<string> => {
  const resource = await useAuthorResource();

  const search = await resource.findAll({
    q: name,
    sort: 'name',
    sortDir: 'asc',
  });

  const existing = search.data?.data?.[0];
  if (existing) return existing.id;

  const created = await resource.create({ name }); // api.post<{ id: string }>('/author', { name });
  return created.id;
};

/** Full flow: ISBN lookup → find/create author → POST book. */
export const createBookFromIsbn = async (
  isbn: string,
  api: AxiosInstance,
  createBook: (data: Record<string, unknown>) => Promise<unknown>,
): Promise<MappedBook> => {
  const mapped = await searchBookByIsbn(isbn);
  const authorId = await findOrCreateAuthor(api, mapped.author.name);
  await createBook({ ...mapped.book, authorId });
  return mapped;
};
