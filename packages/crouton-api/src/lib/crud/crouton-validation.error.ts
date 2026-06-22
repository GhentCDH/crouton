/**
 * Thrown by `ZodValidationPipe` when the request body fails Zod validation.
 *
 * Using a plain `Error` subclass (instead of NestJS's `BadRequestException`)
 * avoids the `instanceof HttpException` check in `BaseExceptionFilter`, which
 * fails when crouton-api's `@nestjs/common` module is a different runtime
 * instance from the consumer's one (common in Docker + tsconfig-paths setups).
 *
 * `CroutonValidationExceptionFilter` catches this class and writes a 400
 * response directly on the HTTP response object, bypassing the HttpException
 * hierarchy entirely.
 */
export class CroutonValidationError extends Error {
  constructor(
    public readonly errors: Array<{ field: string; message: string }>,
  ) {
    super('Validation failed');
    this.name = 'CroutonValidationError';
  }
}
