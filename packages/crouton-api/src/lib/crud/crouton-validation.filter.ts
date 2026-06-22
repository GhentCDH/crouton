import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
} from '@nestjs/common';

import { CroutonValidationError } from './crouton-validation.error';

/**
 * Handles `CroutonValidationError` thrown by `ZodValidationPipe`.
 *
 * Writes the 400 response directly on the HTTP response object so that no
 * `HttpException` class is involved — avoiding the `instanceof` mismatch
 * that occurs when crouton-api's `@nestjs/common` is a different runtime
 * instance from the consumer's one.
 */
@Catch(CroutonValidationError)
export class CroutonValidationExceptionFilter implements ExceptionFilter {
  catch(exception: CroutonValidationError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    res.status(400).json({
      statusCode: 400,
      message: exception.errors,
      error: 'Bad Request',
    });
  }
}
