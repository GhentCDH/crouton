import { createZodDto } from 'nestjs-zod';

import { RequestSchema } from '@ghentcdh/crouton-core';

export class RequestDtoNoOffset extends createZodDto(RequestSchema) {}
