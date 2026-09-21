import { z } from 'zod';

export const BaseOptionsSchema = z
  .object({
    label: z.string().optional().describe('Override the field label'),
    hideLabel: z.boolean().optional().describe('Hide the label'),
    placeholder: z.string().optional(),
    readonly: z.boolean().optional(),
    colspan: z.number().optional(),
    width: z.string().optional(),
    styles: z.record(z.string(), z.unknown()).optional(),
    customRender: z.string().optional(),
  })
  .catchall(z.unknown());

export type BaseOptions = z.infer<typeof BaseOptionsSchema>;
