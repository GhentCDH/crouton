import { z } from 'zod';

export * from './action.schema';
export * from './operation.schema';
export * from './view.schema';

import {
  type Method,
  type Operation,
  type OperationKey,
  OperationMap,
  OperationSuffixMap,
  Operations,
} from './operation.schema';
import { Display, FormDevSchemas } from './view.schema';

/** Display shape after normalization — both contexts are always present. */
export type NormalizedDisplay = {
  form: { mode: 'page' | 'modal' };
  view: { mode: 'page' | 'modal'; customComponent: string | null };
};

/**
 * Fill in the per-context defaults so consumers can always read
 * `display.form.mode` / `display.view.mode`. Older payloads (or a missing
 * `display`) are normalized to modal in both contexts.
 */
const normalizeDisplay = (
  display?: z.infer<typeof Display>,
): NormalizedDisplay => ({
  form: { mode: display?.form?.mode ?? 'modal' },
  view: {
    mode: display?.view?.mode ?? 'modal',
    customComponent: display?.view?.customComponent ?? null,
  },
});

export const ResourceDefinitionResponseZ = z
  .object({
    id: z.string(),
    name: z.string(),
    route: z.string(),
    title: z.string(),
    uri: z.string(),
    display: Display.optional(),
    idField: z.string().default('id'),
    modalSize: z.enum(['xs', 'sm', 'lg', 'xl']).optional(),
    operations: Operations,
    schemas: FormDevSchemas,
    allowedIncludes: z.array(z.string()).default([]),
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
          method: (operation.method?.toLowerCase() ??
            defaultOperation) as Method,
        };
      };

      operations[key] = mapResourceSchema();
    }

    return {
      ...data,
      display: normalizeDisplay(data.display),
      operations: {
        ...operations,
        ...(data.operations.lookup !== undefined && {
          lookup: data.operations.lookup,
        }),
      },
    };
  });

export type ResourceDefinitionResponse = z.infer<
  typeof ResourceDefinitionResponseZ
>;
