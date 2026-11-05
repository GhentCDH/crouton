/**
 * NestJS interceptor: parse `Accept-Language`, resolve against supported
 * languages, store in AsyncLocalStorage, set `Vary` and `Content-Language`
 * response headers.
 */

import { resolveLanguage } from '@crouton/i18n';
import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';


import { runWithLanguage } from './language.context';
import { type TranslationRegistry } from './translation.registry';

@Injectable()
export class LanguageInterceptor implements NestInterceptor {
  constructor(private readonly registry: TranslationRegistry) {}

  intercept(context: ExecutionContext, next: CallHandler): ReturnType<CallHandler['handle']> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const response = http.getResponse<{ setHeader(name: string, value: string): void }>();

    const acceptLanguage = request.headers['accept-language'] as string | undefined;
    const resolved = resolveLanguage(
      acceptLanguage,
      this.registry.languages,
      this.registry.defaultLanguage,
    );

    response.setHeader('Vary', 'Accept-Language');
    response.setHeader('Content-Language', resolved);

    return runWithLanguage(resolved, () => next.handle());
  }
}
