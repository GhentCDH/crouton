import { z } from 'zod';

import { RequestSchema } from './request.model';
import { PositiveRequestNumber } from './zod.types';

export const ResponseRequestSchema = RequestSchema.extend({
  count: PositiveRequestNumber(),
  totalPages: PositiveRequestNumber(),
});

export const ResponseSchema = z.object({
  data: z.array(z.unknown()),
  request: ResponseRequestSchema,
});

export type ResponseData<TYPE> = z.infer<typeof ResponseSchema> & {
  data: TYPE[];
};
