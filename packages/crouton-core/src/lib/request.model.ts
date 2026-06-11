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

export type Request = z.infer<typeof RequestSchema>;

export const RequestSchemaWithOffset = RequestSchema.transform((schema) => {
  const { page, pageSize, sort } = schema;
  return {
    ...schema,
    sort: sort || 'id',
    offset: (page - 1) * pageSize,
  };
});
