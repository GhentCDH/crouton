import { z } from 'zod';

export const WriteOpSchema = z.enum(['create', 'update', 'patch', 'upsert', 'delete']);
export type WriteOp = z.infer<typeof WriteOpSchema>;

export const ReadOpSchema = z.enum(['findAll', 'findOne']);
export type ReadOp = z.infer<typeof ReadOpSchema>;

export interface WriteHookContext<PRISMACLIENT> {
  prisma: PRISMACLIENT;
  op: WriteOp;
  id?: string | number;
}

export interface ReadHookContext<PRISMACLIENT> {
  prisma: PRISMACLIENT;
  op: ReadOp;
}

export const ResourceHooksSchema = z.object({
  beforeWrite: z
    .custom<(data: any, ctx: WriteHookContext<any>) => Promise<any> | any>()
    .optional(),
  afterWrite: z
    .custom<(result: any, ctx: WriteHookContext<any>) => Promise<any> | any>()
    .optional(),
  afterRead: z
    .custom<(row: any, ctx: ReadHookContext<any>) => Promise<any> | any>()
    .optional(),
});

export type ResourceHooks<PRISMACLIENT = any> = z.infer<
  typeof ResourceHooksSchema
>;