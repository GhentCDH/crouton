import { SectionSchema } from '@mela/generated-types';
import { createZodDto } from '../../zod-utils';

export class MoveSectionDto extends createZodDto(
  SectionSchema.pick({ section_order: true }),
) {}
