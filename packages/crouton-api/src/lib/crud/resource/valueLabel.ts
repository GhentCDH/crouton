import { z } from 'zod';

const ValueSchema = z.object({
  value: z.unknown(),
  label: z.string(),
});
/**
 * A column whose stored scalar is serialized as `{ value, label }` on read and
 * normalized back to the scalar on write. Computed at load time from columns
 * flagged `fieldInput.options.emitObject` that carry an `options.values` list.
 */
export const ValueLabelColumnSchema = z.object({
  /** Row field/key to transform. */ field: z.string(),
  values: z.array(ValueSchema).default([]),
});

export type ValueLabelColumn = z.infer<typeof ValueLabelColumnSchema>;
