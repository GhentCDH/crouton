import { z } from 'zod';

import { PositiveRequestNumber, StringOrArray } from './zod.types';

export const SortDirEnum = z.enum(['asc', 'desc']);
export type SortDir = z.infer<typeof SortDirEnum>;

export const RequestSchema = z.object({
  page: PositiveRequestNumber().optional().default(1),
  pageSize: PositiveRequestNumber().optional().default(20),
  sort: z.string().optional().default('id'),
  sortDir: SortDirEnum.optional().default('asc'),
  // Filter is of the format key:value:operator (e.g. name:john:eq) operator is optional
  filter: StringOrArray().optional().default([]),
});

export type ListRequest = z.infer<typeof RequestSchema>;

/** @deprecated Use `ListRequest` instead — `Request` shadows the global DOM `Request` type. */
export type Request = ListRequest;

export const RequestSchemaWithOffset = RequestSchema.transform((schema) => {
  const { page, pageSize, sort } = schema;
  return {
    ...schema,
    sort: sort || 'id',
    offset: (page - 1) * pageSize,
  };
});

export type ListRequestWithOffset = z.infer<typeof RequestSchemaWithOffset>;

/**
 * Zero-based row offset for a list request.
 *
 * Controllers validate query params with `RequestSchema` (no `offset`), while
 * `RequestSchemaWithOffset` adds one — so consumers cannot rely on the field
 * being present. Derive it here instead of duplicating the arithmetic at every
 * call site.
 */
export const offsetOf = (params: ListRequest): number =>
  (params as Partial<ListRequestWithOffset>).offset ??
  (params.page - 1) * params.pageSize;
