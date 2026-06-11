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
  .transform((d) => d.toLowerCase());

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

const Operations = z.object({
  create: BooleanOperationSchema,
  delete: BooleanOperationSchema,
  findAll: BooleanOperationSchema,
  findOne: BooleanOperationSchema,
  update: BooleanOperationSchema,
});

export type Operation = z.infer<typeof OperationSchema>;
export type OperationKey = keyof z.infer<typeof Operations>;
const OperationMap: Record<OperationKey, Method> = {
  create: 'post',
  delete: 'delete',
  findAll: 'get',
  findOne: 'get',
  update: 'patch',
};
const OperationSuffixMap: Record<OperationKey, string> = {
  create: '',
  delete: '/{id}',
  findAll: '',
  findOne: '/{id}',
  update: '/{id}',
};
export const ViewSchemaZ = z.object({
  data: z.any(),
  ui: z.any(),
  defaultSort: z.string().optional(),
});
const ActionConditionSchema = z.object({
  field: z.string(),
  op: z
    .enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'exists', 'notExists'])
    .optional()
    .default('eq'),
  value: z.unknown().optional(),
});

export const ActionSchema = z.union([
  z.object({
    type: z.literal('link'),
    id: z.string(),
    label: z.string(),
    href: z.string(),
    condition: ActionConditionSchema.optional(),
  }),
  z.object({
    type: z.literal('procedure').optional().default('procedure'),
    id: z.string(),
    label: z.string(),
    uri: z.string(),
    method: MethodSchema.optional().default('post'),
    data: z.any().optional(),
    condition: ActionConditionSchema.optional(),
  }),
]);

export type Action = z.infer<typeof ActionSchema>;

/** Schema for a single table-level (global) action — no record id, no condition. */
export const TableActionSchema = z.union([
  z.object({
    type: z.literal('link'),
    id: z.string(),
    label: z.string().optional(),
    icon: z.string().optional(),
    tooltip: z.string().optional(),
    href: z.string(),
  }),
  z.object({
    type: z.literal('procedure').optional().default('procedure'),
    id: z.string(),
    label: z.string().optional(),
    icon: z.string().optional(),
    tooltip: z.string().optional(),
    uri: z.string(),
    method: MethodSchema.optional().default('post'),
    data: z.any().optional(),
  }),
]);

export type TableAction = z.infer<typeof TableActionSchema>;

export const FormDevSchemas = z.object({
  table: ViewSchemaZ,
  form: ViewSchemaZ,
  view: ViewSchemaZ.optional(),
  filter: ViewSchemaZ.optional(),
});
export type FormDevSchema = z.infer<typeof FormDevSchemas>;
export const FormDefResponseZ = z
  .object({
    id: z.string(),
    name: z.string(),
    route: z.string(),
    title: z.string(),
    uri: z.string(),
    idField: z.string().default('id'),
    idType: z.enum(['string', 'number']).default('string'),
    modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).optional(),
    operations: Operations,
    actions: z.array(ActionSchema).optional().default([]),
    tableActions: z.array(TableActionSchema).optional().default([]),
    schemas: FormDevSchemas,
  })
  .transform((data) => {
    const operations = {} as Record<OperationKey, Operation | null>;

    for (const k in OperationMap) {
      const key = k as OperationKey;
      const defaultOperation = OperationMap[key];
      const defaultSuffix = OperationSuffixMap[key];
      const operation = data.operations[key];

      const mapResourceSchema = () => {
        if (operation === undefined || operation === false) return null;

        if (operation === true)
          return {
            uri: `${data.uri}${defaultSuffix}`,
            method: defaultOperation,
          } as Operation;
        if (typeof operation === 'string')
          return { uri: operation, method: 'get' } as Operation;

        return {
          uri: operation.uri,
          method: operation.method?.toLowerCase() ?? defaultOperation,
        };
      };

      operations[key] = mapResourceSchema();
    }

    return {
      ...data,
      operations,
    };
  });

export type FormDefResponse = z.infer<typeof FormDefResponseZ>;
