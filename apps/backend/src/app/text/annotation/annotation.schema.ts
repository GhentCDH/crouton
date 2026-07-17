import { W3CAnnotation } from '@ghentcdh/w3c-utils';
import { createZodDto } from '../../zod-utils';

export class MelaAnnotationReturnDto extends createZodDto(W3CAnnotation) {}

export const MelaW3CAnnotationSchema = W3CAnnotation;

export class W3CAnnotationTypeDto extends createZodDto(
  MelaW3CAnnotationSchema,
) {}
