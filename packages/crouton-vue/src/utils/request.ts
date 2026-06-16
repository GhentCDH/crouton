import { z } from 'zod';

const PositiveRequestNumber = () =>
  z.coerce.number().int().positive().nonnegative();

const StringOrArray = () =>
  z
    .string()
    .or(z.array(z.string()))
    .transform((val) => {
      if (Array.isArray(val)) return val;
      return [val];
    });

export const SortDirEnum = z.enum(['asc', 'desc']);
export type SortDir = z.infer<typeof SortDirEnum>;

export const RequestSchema = z.object({
  page: PositiveRequestNumber().optional().default(1),
  pageSize: PositiveRequestNumber().optional().default(20),
  sort: z.string().optional().default(''),
  sortDir: SortDirEnum.optional().default('asc'),
  filter: StringOrArray().optional().default([]),
});

export type Request = z.infer<typeof RequestSchema>;
