import { z } from 'zod';

const textSelector = z.object({
  sectionTextId: z.string(),
  start: z.number(),
  end: z.number(),
});
const annotationSelector = z.object({
  annotationId: z.string(),
  start: z.number(),
  end: z.number(),
});
export type TextSelector = z.infer<typeof textSelector>;

export const annotationDto = z.object({
  type: z.string(),
  textSelector: textSelector.nullish(),
  annotationSelector: annotationSelector.nullish(),
  value: z.any().nullish(),
  relations: z.array(z.string()).nullish(),
});

export type AnnotationDto = z.infer<typeof annotationDto>;
