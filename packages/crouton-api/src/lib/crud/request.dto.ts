import { createZodDto } from '@anatine/zod-nestjs';

import { RequestSchema, RequestSchemaWithOffset } from '@ghentcdh/crouton-core';

export class RequestDtoNoOffset extends createZodDto(RequestSchema) {}
export class RequestDto extends createZodDto(RequestSchemaWithOffset) {}
