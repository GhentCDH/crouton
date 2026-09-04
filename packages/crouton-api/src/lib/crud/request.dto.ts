import { createZodDto } from 'nestjs-zod';

import { RequestSchema, RequestSchemaWithOffset } from '@ghentcdh/crouton-core';

export class RequestDtoNoOffset extends createZodDto(RequestSchema) {}
export class RequestDto extends createZodDto(RequestSchemaWithOffset) {}
