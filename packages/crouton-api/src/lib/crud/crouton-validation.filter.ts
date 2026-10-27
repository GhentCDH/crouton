import { resolveLanguage, validationKey } from '@crouton/i18n';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Inject,
  Optional,
} from '@nestjs/common';


import { CroutonValidationError } from './crouton-validation.error';
import { TranslationRegistry, getRequestLanguage } from './i18n';

/**
 * Handles `CroutonValidationError` thrown by `ZodValidationPipe`.
 *
 * Writes the 400 response directly on the HTTP response object so that no
 * `HttpException` class is involved — avoiding the `instanceof` mismatch
 * that occurs when crouton-api's `@nestjs/common` is a different runtime
 * instance from the consumer's one.
 *
 * When a `TranslationRegistry` is available, error messages are translated
 * using `validation.<code>` keys with `{field}` interpolation.
 */
@Catch(CroutonValidationError)
export class CroutonValidationExceptionFilter implements ExceptionFilter {
  constructor(
    @Optional()
    @Inject(TranslationRegistry)
    private readonly translationRegistry?: TranslationRegistry,
  ) {}

  catch(exception: CroutonValidationError, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<{ headers: Record<string, string | undefined> }>();
    const res = http.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();

    const errors = this.translateErrors(exception.errors, req.headers['accept-language']);

    res.status(400).json({
      statusCode: 400,
      message: errors,
      error: 'Bad Request',
    });
  }

  private translateErrors(
    errors: CroutonValidationError['errors'],
    acceptLanguage?: string,
  ): Array<{ field: string; message: string }> {
    if (!this.translationRegistry) return errors;
    // Exception filters may run outside the AsyncLocalStorage context set by the
    // interceptor, so read Accept-Language from the request as the primary source.
    const language =
      (acceptLanguage
        ? resolveLanguage(
            acceptLanguage,
            this.translationRegistry.languages,
            this.translationRegistry.defaultLanguage,
          )
        : null) ?? getRequestLanguage();
    if (!language) return errors;

    const t = this.translationRegistry.translatorFor(language);

    return errors.map(({ field, message, code }) => {
      if (!code) return { field, message };
      const key = validationKey(code);
      const translated = t(key, '');
      if (!translated) return { field, message };
      // Interpolate {field} placeholder
      return {
        field,
        message: translated.replace(/\{field\}/g, field),
      };
    });
  }
}
