import { z } from 'zod';

export const MethodSchema = z
  .enum([
    'get',
    'post',
    'delete',
    'put',
    'patch',
    'GET',
    'POST',
    'DELETE',
    'PUT',
    'PATCH',
  ])
  .transform((d) => d.toLowerCase() as Lowercase<typeof d>);

export type Method = z.infer<typeof MethodSchema>;

export const OperationSchema = z.object({
  uri: z.string(),
  method: MethodSchema,
});

export const BooleanOperationSchema = z
  .boolean()
  .or(OperationSchema)
  .optional()
  .default(false);

export type Operation = z.infer<typeof OperationSchema>;

const CrudOperations = z.object({
  create: BooleanOperationSchema,
  delete: BooleanOperationSchema,
  findAll: BooleanOperationSchema,
  findOne: BooleanOperationSchema,
  update: BooleanOperationSchema,
  patch: BooleanOperationSchema,
});

export const Operations = CrudOperations.extend({
  lookup: z.string().optional(),
});

export type OperationKey = keyof z.infer<typeof CrudOperations>;

export const OperationMap: Record<OperationKey, Method> = {
  create: 'post',
  delete: 'delete',
  findAll: 'get',
  findOne: 'get',
  update: 'put',
  patch: 'patch',
};

export const OperationSuffixMap: Record<OperationKey, string> = {
  create: '',
  delete: '/{id}',
  findAll: '',
  findOne: '/{id}',
  update: '/{id}',
  patch: '/{id}',
};
